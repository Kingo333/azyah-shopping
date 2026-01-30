import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShoppingResult {
  title: string;
  link: string;
  thumbnail: string;
  source: string;
  price: string;
  extracted_price: number | null;
  rating?: number;
  reviews?: number;
  position: number;
}

interface DealsResponse {
  success: boolean;
  input_url: string;
  extracted_product: {
    title: string | null;
    image: string | null;
    brand: string | null;
  };
  shopping_results: ShoppingResult[];
  price_stats: {
    low: number | null;
    median: number | null;
    high: number | null;
    valid_count: number;
  };
  deals_found: number;
  error?: string;
}

// Extract product metadata from HTML
function extractMetadata(html: string): { title: string | null; image: string | null; brand: string | null } {
  let title: string | null = null;
  let image: string | null = null;
  let brand: string | null = null;

  // Extract og:title
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  if (ogTitleMatch) {
    title = ogTitleMatch[1];
  } else {
    // Fallback to <title>
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      title = titleMatch[1];
    }
  }

  // Extract og:image
  const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  if (ogImageMatch) {
    image = ogImageMatch[1];
  }

  // Extract brand hints
  const ogSiteMatch = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i);
  if (ogSiteMatch) {
    brand = ogSiteMatch[1];
  }

  // Clean up title
  if (title) {
    // Remove common suffixes like "| Brand Name" or "- Store"
    title = title.replace(/\s*[\|\-–—]\s*[^|\-–—]+$/, '').trim();
  }

  return { title, image, brand };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SERPAPI_KEY = Deno.env.get('SERPAPI_API_KEY');
    if (!SERPAPI_KEY) {
      throw new Error('SERPAPI_API_KEY not configured');
    }

    // Verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'url is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[deals-from-url] Processing URL for user ${user.id}: ${url}`);

    // Step 1: Fetch and extract product metadata
    let extractedProduct = { title: null as string | null, image: null as string | null, brand: null as string | null };
    
    try {
      const pageResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AzyahBot/1.0)',
        },
      });
      
      if (pageResponse.ok) {
        const html = await pageResponse.text();
        extractedProduct = extractMetadata(html);
        console.log(`[deals-from-url] Extracted: title="${extractedProduct.title}", image="${extractedProduct.image?.substring(0, 50)}..."`);
      }
    } catch (err) {
      console.warn('[deals-from-url] Failed to fetch product page:', err);
    }

    const allShoppingResults: ShoppingResult[] = [];
    const seenLinks = new Set<string>();

    // Step 2: If we have an og:image, run Google Lens for visual similarity (PRIMARY)
    if (extractedProduct.image) {
      console.log(`[deals-from-url] Running Google Lens on og:image...`);
      
      try {
        const lensParams = new URLSearchParams({
          engine: 'google_lens',
          url: extractedProduct.image,
          api_key: SERPAPI_KEY,
          gl: 'ae',
          hl: 'en',
        });

        const lensResponse = await fetch(`https://serpapi.com/search?${lensParams.toString()}`);
        const lensData = await lensResponse.json();

        if (!lensData.error) {
          // Extract visual matches and search for each
          const visualMatches = (lensData.visual_matches || [])
            .slice(0, 3)
            .filter((match: any) => {
              const source = (match.source || '').toLowerCase();
              return !source.includes('pinterest') && !source.includes('instagram');
            });

          console.log(`[deals-from-url] Lens found ${visualMatches.length} visual matches`);

          // Search shopping for each visual match
          for (const match of visualMatches) {
            if (!match.title) continue;

            const shoppingParams = new URLSearchParams({
              engine: 'google_shopping',
              q: match.title,
              api_key: SERPAPI_KEY,
              gl: 'ae',
              hl: 'en',
              location: 'United Arab Emirates',
            });

            try {
              const shoppingResponse = await fetch(`https://serpapi.com/search?${shoppingParams.toString()}`);
              const shoppingData = await shoppingResponse.json();

              if (shoppingData.shopping_results) {
                for (const result of shoppingData.shopping_results.slice(0, 10)) {
                  if (seenLinks.has(result.link)) continue;
                  seenLinks.add(result.link);

                  allShoppingResults.push({
                    title: result.title || '',
                    link: result.link || '',
                    thumbnail: result.thumbnail || '',
                    source: result.source || '',
                    price: result.price || '',
                    extracted_price: result.extracted_price || null,
                    rating: result.rating || undefined,
                    reviews: result.reviews || undefined,
                    position: allShoppingResults.length + 1,
                  });
                }
              }
            } catch (err) {
              console.warn(`[deals-from-url] Shopping search error for "${match.title}":`, err);
            }
          }
        }
      } catch (err) {
        console.warn('[deals-from-url] Lens API error:', err);
      }
    }

    // Step 3: If Lens didn't yield enough results, fall back to text search
    if (allShoppingResults.length < 5) {
      let searchQuery = '';
      if (extractedProduct.title) {
        searchQuery = extractedProduct.title;
        if (extractedProduct.brand && !searchQuery.toLowerCase().includes(extractedProduct.brand.toLowerCase())) {
          searchQuery = `${extractedProduct.brand} ${searchQuery}`;
        }
      } else {
        // Fallback: extract from URL
        try {
          const urlObj = new URL(url);
          const pathParts = urlObj.pathname.split('/').filter(Boolean);
          searchQuery = pathParts[pathParts.length - 1]?.replace(/[-_]/g, ' ') || '';
        } catch {
          searchQuery = '';
        }
      }

      if (searchQuery) {
        console.log(`[deals-from-url] Text fallback search: "${searchQuery.substring(0, 80)}..."`);

        const shoppingParams = new URLSearchParams({
          engine: 'google_shopping',
          q: searchQuery,
          api_key: SERPAPI_KEY,
          gl: 'ae',
          hl: 'en',
          location: 'United Arab Emirates',
        });

        const shoppingResponse = await fetch(`https://serpapi.com/search?${shoppingParams.toString()}`);
        const shoppingData = await shoppingResponse.json();

        if (!shoppingData.error && shoppingData.shopping_results) {
          for (const result of shoppingData.shopping_results.slice(0, 20)) {
            if (seenLinks.has(result.link)) continue;
            seenLinks.add(result.link);

            allShoppingResults.push({
              title: result.title || '',
              link: result.link || '',
              thumbnail: result.thumbnail || '',
              source: result.source || '',
              price: result.price || '',
              extracted_price: result.extracted_price || null,
              rating: result.rating || undefined,
              reviews: result.reviews || undefined,
              position: allShoppingResults.length + 1,
            });
          }
        }
      }
    }

    if (allShoppingResults.length === 0 && !extractedProduct.title && !extractedProduct.image) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Could not extract product information from URL',
          input_url: url,
          extracted_product: extractedProduct,
          shopping_results: [],
          price_stats: { low: null, median: null, high: null, valid_count: 0 },
          deals_found: 0,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[deals-from-url] Total shopping results: ${allShoppingResults.length}`);

    // Step 4: Compute price statistics with guardrails
    const validPrices = allShoppingResults
      .map(r => r.extracted_price)
      .filter((p): p is number => p !== null && p > 0);

    let priceStats = {
      low: null as number | null,
      median: null as number | null,
      high: null as number | null,
      valid_count: validPrices.length,
    };

    if (validPrices.length >= 5) {
      const sorted = [...validPrices].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      
      // Remove outliers
      const filtered = sorted.filter(p => p >= median * 0.1 && p <= median * 5);
      
      if (filtered.length >= 5) {
        priceStats.low = filtered[Math.floor(filtered.length * 0.25)];
        priceStats.median = filtered[Math.floor(filtered.length * 0.5)];
        priceStats.high = filtered[Math.floor(filtered.length * 0.75)];
      }
    }

    // Sort by price
    allShoppingResults.sort((a, b) => {
      if (a.extracted_price === null) return 1;
      if (b.extracted_price === null) return -1;
      return a.extracted_price - b.extracted_price;
    });

    const response: DealsResponse = {
      success: true,
      input_url: url,
      extracted_product: extractedProduct,
      shopping_results: allShoppingResults,
      price_stats: priceStats,
      deals_found: allShoppingResults.length,
    };

    console.log(`[deals-from-url] Success: ${allShoppingResults.length} deals found`);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[deals-from-url] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        shopping_results: [],
        price_stats: { low: null, median: null, high: null, valid_count: 0 },
        deals_found: 0,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
