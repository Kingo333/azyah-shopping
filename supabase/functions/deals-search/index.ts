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
  query: string;
  shopping_results: ShoppingResult[];
  price_stats: {
    low: number | null;
    median: number | null;
    high: number | null;
    valid_count: number;
  };
  deals_found: number;
  used_lens_fallback?: boolean;
  error?: string;
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

    const { q, sort_by } = await req.json();

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Search query (q) is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate query length
    if (q.trim().length > 200) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query too long (max 200 chars)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[deals-search] Searching for user ${user.id}: "${q}"`);

    const allShoppingResults: ShoppingResult[] = [];
    const seenLinks = new Set<string>();
    let usedLensFallback = false;

    // Step 1: Call Google Shopping via SerpApi
    const params = new URLSearchParams({
      engine: 'google_shopping',
      q: q.trim(),
      api_key: SERPAPI_KEY,
      gl: 'ae',  // UAE default
      hl: 'en',
      location: 'United Arab Emirates',
    });

    // Add sort if specified (1 = price low to high, 2 = price high to low)
    if (sort_by === 1 || sort_by === 2) {
      params.set('tbs', sort_by === 1 ? 'p_ord:p' : 'p_ord:pd');
    }

    const shoppingResponse = await fetch(`https://serpapi.com/search?${params.toString()}`);
    const shoppingData = await shoppingResponse.json();

    if (shoppingData.error) {
      throw new Error(`Shopping API error: ${shoppingData.error}`);
    }

    // Add initial shopping results
    for (const result of (shoppingData.shopping_results || []).slice(0, 30)) {
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

    console.log(`[deals-search] Initial shopping results: ${allShoppingResults.length}`);

    // Step 2: If <5 results, use Google Lens fallback with top result thumbnail
    if (allShoppingResults.length < 5 && allShoppingResults.length > 0) {
      const topResult = allShoppingResults[0];
      
      if (topResult.thumbnail) {
        console.log(`[deals-search] Running Lens fallback on top result thumbnail...`);
        usedLensFallback = true;

        try {
          const lensParams = new URLSearchParams({
            engine: 'google_lens',
            url: topResult.thumbnail,
            api_key: SERPAPI_KEY,
            gl: 'ae',
            hl: 'en',
          });

          const lensResponse = await fetch(`https://serpapi.com/search?${lensParams.toString()}`);
          const lensData = await lensResponse.json();

          if (!lensData.error) {
            const visualMatches = (lensData.visual_matches || [])
              .slice(0, 5)
              .filter((match: any) => {
                const source = (match.source || '').toLowerCase();
                return !source.includes('pinterest') && !source.includes('instagram');
              });

            console.log(`[deals-search] Lens found ${visualMatches.length} visual matches`);

            // Search shopping for each visual match
            for (const match of visualMatches.slice(0, 3)) {
              if (!match.title) continue;

              const expandParams = new URLSearchParams({
                engine: 'google_shopping',
                q: match.title,
                api_key: SERPAPI_KEY,
                gl: 'ae',
                hl: 'en',
                location: 'United Arab Emirates',
              });

              try {
                const expandResponse = await fetch(`https://serpapi.com/search?${expandParams.toString()}`);
                const expandData = await expandResponse.json();

                if (expandData.shopping_results) {
                  for (const result of expandData.shopping_results.slice(0, 10)) {
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
                console.warn(`[deals-search] Expand search error for "${match.title}":`, err);
              }
            }
          }
        } catch (err) {
          console.warn('[deals-search] Lens fallback error:', err);
        }
      }
    }

    console.log(`[deals-search] Final result count: ${allShoppingResults.length}`);

    // Step 3: Compute price statistics with guardrails
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

    // Sort by price if not already sorted by API
    if (!sort_by) {
      allShoppingResults.sort((a, b) => {
        if (a.extracted_price === null) return 1;
        if (b.extracted_price === null) return -1;
        return a.extracted_price - b.extracted_price;
      });
    }

    const response: DealsResponse = {
      success: true,
      query: q.trim(),
      shopping_results: allShoppingResults,
      price_stats: priceStats,
      deals_found: allShoppingResults.length,
      used_lens_fallback: usedLensFallback,
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[deals-search] Error:', error);
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
