import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Safe scraping configuration
const SAFE_SCRAPE_DEFAULTS = {
  perDomain: {
    maxConcurrency: 3,
    reqsPerSecond: 1,
    maxProductsPerRun: 500,
    maxDepth: 2,
  },
  timing: {
    navTimeoutMs: 45000,
    stallTimeoutMs: 30000,
    jitterMs: [300, 1500],
  },
  retry: {
    maxRetries: 2,
    backoffMs: (attempt: number) => 1000 * Math.pow(2, attempt), // 1s, 2s, 4s
  },
  headers: {
    userAgent: 'AzyahImporter/1.0 (+contact: support@azyah.com)',
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    acceptLanguage: 'en-US,en;q=0.9',
  },
};

// Rate limiting helper
class RateLimiter {
  private lastRequest: number = 0;
  private requestInterval: number;

  constructor(rps: number = 1) {
    this.requestInterval = 1000 / rps; // milliseconds between requests
  }

  async wait(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    const waitTime = Math.max(0, this.requestInterval - timeSinceLastRequest);
    
    if (waitTime > 0) {
      // Add random jitter to avoid perfect rhythm
      const jitter = Math.random() * (SAFE_SCRAPE_DEFAULTS.timing.jitterMs[1] - SAFE_SCRAPE_DEFAULTS.timing.jitterMs[0]) + SAFE_SCRAPE_DEFAULTS.timing.jitterMs[0];
      await new Promise(resolve => setTimeout(resolve, waitTime + jitter));
    }
    
    this.lastRequest = Date.now();
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, maxUrls = 50, sourceId, respectRobots = true } = await req.json();
    
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Starting safe discovery for URL:', url);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const domain = new URL(url).origin;
    const hostname = new URL(url).hostname;
    
    // Check robots.txt if requested
    if (respectRobots) {
      console.log('Checking robots.txt compliance...');
      const { data: robotsResult } = await supabase.functions.invoke('robots-checker', {
        body: { domain: hostname, userAgent: SAFE_SCRAPE_DEFAULTS.headers.userAgent }
      });

      if (robotsResult && !robotsResult.allowed) {
        return new Response(JSON.stringify({
          error: 'Site robots.txt disallows crawling',
          success: false,
          robotsBlocked: true
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Create crawl session for tracking
    let crawlSession = null;
    if (sourceId) {
      const { data: session } = await supabase
        .from('crawl_sessions')
        .insert({
          source_id: sourceId,
          domain: hostname,
          status: 'running'
        })
        .select()
        .single();
      crawlSession = session;
    }

    const productUrls = new Set<string>();
    const rateLimiter = new RateLimiter(SAFE_SCRAPE_DEFAULTS.perDomain.reqsPerSecond);
    let urlsProcessed = 0;
    let urlsFailed = 0;

    // Helper function to check if URL looks like a product page
    const looksLikeProduct = (urlStr: string): boolean => {
      const productPatterns = [
        '/product/', '/products/', '/item/', '/items/',
        '/p/', '/shop/', '/collections/', '/catalog/',
        '/store/', '/buy/', '/goods/'
      ];
      return productPatterns.some(pattern => 
        urlStr.toLowerCase().includes(pattern.toLowerCase())
      );
    };

    // Helper function to make safe requests
    const safeFetch = async (requestUrl: string, retryCount = 0): Promise<Response | null> => {
      try {
        await rateLimiter.wait();
        
        const response = await fetch(requestUrl, {
          headers: {
            'User-Agent': SAFE_SCRAPE_DEFAULTS.headers.userAgent,
            'Accept': SAFE_SCRAPE_DEFAULTS.headers.accept,
            'Accept-Language': SAFE_SCRAPE_DEFAULTS.headers.acceptLanguage,
            'Referer': domain,
          },
          signal: AbortSignal.timeout(SAFE_SCRAPE_DEFAULTS.timing.stallTimeoutMs),
        });

        urlsProcessed++;

        // Handle rate limiting responses
        if (response.status === 429 || response.status === 403) {
          urlsFailed++;
          if (crawlSession) {
            await supabase
              .from('crawl_sessions')
              .update({ 
                rate_limit_hits: (crawlSession.rate_limit_hits || 0) + 1,
                status: 'rate_limited',
                error_details: { 
                  last_error: `HTTP ${response.status}`, 
                  url: requestUrl 
                }
              })
              .eq('id', crawlSession.id);
          }
          return null;
        }

        return response;
      } catch (error) {
        urlsFailed++;
        console.log(`Request failed for ${requestUrl}:`, error.message);
        
        if (retryCount < SAFE_SCRAPE_DEFAULTS.retry.maxRetries) {
          const backoffTime = SAFE_SCRAPE_DEFAULTS.retry.backoffMs(retryCount);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          return safeFetch(requestUrl, retryCount + 1);
        }
        
        return null;
      }
    };

    // Try sitemap first
    try {
      console.log('Checking sitemap...');
      const sitemapUrl = `${domain}/sitemap.xml`;
      const sitemapResponse = await safeFetch(sitemapUrl);

      if (sitemapResponse && sitemapResponse.ok) {
        const sitemapText = await sitemapResponse.text();
        
        // Parse sitemap XML
        const locMatches = sitemapText.match(/<loc>(.*?)<\/loc>/g);
        if (locMatches) {
          for (const match of locMatches) {
            const urlMatch = match.match(/<loc>(.*?)<\/loc>/);
            if (urlMatch && urlMatch[1]) {
              const foundUrl = urlMatch[1].trim();
              if (looksLikeProduct(foundUrl) && productUrls.size < maxUrls) {
                productUrls.add(foundUrl);
              }
            }
          }
        }

        // Check for nested sitemaps
        const sitemapMatches = sitemapText.match(/<sitemap>[\s\S]*?<\/sitemap>/g);
        if (sitemapMatches) {
          for (const sitemapMatch of sitemapMatches.slice(0, 10)) { // Limit nested sitemaps
            const nestedUrlMatch = sitemapMatch.match(/<loc>(.*?)<\/loc>/);
            if (nestedUrlMatch && nestedUrlMatch[1] && productUrls.size < maxUrls) {
              try {
                const nestedResponse = await safeFetch(nestedUrlMatch[1]);
                if (nestedResponse && nestedResponse.ok) {
                  const nestedText = await nestedResponse.text();
                  const nestedLocMatches = nestedText.match(/<loc>(.*?)<\/loc>/g);
                  if (nestedLocMatches) {
                    for (const nestedMatch of nestedLocMatches) {
                      const nestedUrlMatch = nestedMatch.match(/<loc>(.*?)<\/loc>/);
                      if (nestedUrlMatch && nestedUrlMatch[1]) {
                        const foundUrl = nestedUrlMatch[1].trim();
                        if (looksLikeProduct(foundUrl) && productUrls.size < maxUrls) {
                          productUrls.add(foundUrl);
                        }
                      }
                    }
                  }
                }
              } catch (error) {
                console.log('Error fetching nested sitemap:', error);
              }
            }
          }
        }
      }
    } catch (error) {
      console.log('Sitemap not found or error:', error);
    }

    // If no products found via sitemap, try crawling the collection page
    if (productUrls.size === 0) {
      console.log('No sitemap products found, trying collection page crawl...');
      try {
        const pageResponse = await safeFetch(url);

        if (pageResponse && pageResponse.ok) {
          const html = await pageResponse.text();
          
          // Extract links using regex (simple approach for Deno edge functions)
          const linkMatches = html.match(/href=["'](.*?)["']/g);
          if (linkMatches) {
            for (const linkMatch of linkMatches) {
              const hrefMatch = linkMatch.match(/href=["'](.*?)["']/);
              if (hrefMatch && hrefMatch[1]) {
                try {
                  const foundUrl = new URL(hrefMatch[1], url).toString();
                  if (foundUrl.startsWith(domain) && looksLikeProduct(foundUrl) && productUrls.size < maxUrls) {
                    productUrls.add(foundUrl);
                  }
                } catch (error) {
                  // Invalid URL, skip
                }
              }
            }
          }
        }
      } catch (error) {
        console.log('Error crawling collection page:', error);
      }
    }

    const results = Array.from(productUrls).slice(0, Math.min(maxUrls, SAFE_SCRAPE_DEFAULTS.perDomain.maxProductsPerRun));
    
    // Update crawl session
    if (crawlSession) {
      await supabase
        .from('crawl_sessions')
        .update({
          urls_discovered: results.length,
          urls_processed: urlsProcessed,
          urls_failed: urlsFailed,
          status: 'completed',
          session_metrics: {
            discovery_method: productUrls.size > 0 ? 'sitemap' : 'page_crawl',
            rate_limit_hits: crawlSession.rate_limit_hits || 0,
            total_requests: urlsProcessed + urlsFailed
          }
        })
        .eq('id', crawlSession.id);
    }
    
    console.log(`Safe discovery complete. Found ${results.length} product URLs, processed ${urlsProcessed} pages, ${urlsFailed} failed`);

    return new Response(JSON.stringify({ 
      success: true,
      productUrls: results,
      totalFound: results.length,
      metrics: {
        urlsProcessed,
        urlsFailed,
        rateLimited: urlsFailed > 0,
        crawlSessionId: crawlSession?.id
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in website discovery:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});