import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, maxUrls = 50 } = await req.json();
    
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Starting discovery for URL:', url);
    
    const productUrls = new Set<string>();
    const domain = new URL(url).origin;

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

    // Try sitemap first
    try {
      console.log('Checking sitemap...');
      const sitemapUrl = `${domain}/sitemap.xml`;
      const sitemapResponse = await fetch(sitemapUrl, {
        headers: {
          'User-Agent': 'Azyah Product Importer (+support@azyah.com)'
        }
      });

      if (sitemapResponse.ok) {
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
                const nestedResponse = await fetch(nestedUrlMatch[1], {
                  headers: {
                    'User-Agent': 'Azyah Product Importer (+support@azyah.com)'
                  }
                });
                if (nestedResponse.ok) {
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
        const pageResponse = await fetch(url, {
          headers: {
            'User-Agent': 'Azyah Product Importer (+support@azyah.com)'
          }
        });

        if (pageResponse.ok) {
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

    const results = Array.from(productUrls).slice(0, maxUrls);
    
    console.log(`Discovery complete. Found ${results.length} product URLs`);

    return new Response(JSON.stringify({ 
      success: true,
      productUrls: results,
      totalFound: results.length
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