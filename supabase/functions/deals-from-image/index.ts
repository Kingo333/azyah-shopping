import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const CACHE_TTL_MS = 30 * 60 * 1000;

interface LensVisualMatch {
  title: string;
  link: string;
  thumbnail: string;
  source: string;
}

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
  input_image: string;
  visual_matches: LensVisualMatch[];
  shopping_results: ShoppingResult[];
  price_stats: {
    low: number | null;
    median: number | null;
    high: number | null;
    valid_count: number;
  };
  deals_found: number;
  cached?: boolean;
  error?: string;
}

function hashKey(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `img_${Math.abs(hash).toString(36)}`;
}

async function checkRateLimit(supabase: any, userId: string): Promise<boolean> {
  const windowStart = new Date(Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS);
  
  const { data: existing } = await supabase
    .from('deals_rate_limit')
    .select('request_count')
    .eq('user_id', userId)
    .eq('window_start', windowStart.toISOString())
    .single();

  if (existing) {
    if (existing.request_count >= RATE_LIMIT_MAX_REQUESTS) {
      return false;
    }
    await supabase
      .from('deals_rate_limit')
      .update({ request_count: existing.request_count + 1 })
      .eq('user_id', userId)
      .eq('window_start', windowStart.toISOString());
  } else {
    await supabase
      .from('deals_rate_limit')
      .insert({ user_id: userId, window_start: windowStart.toISOString(), request_count: 1 });
  }
  return true;
}

async function getCache(supabase: any, key: string): Promise<any | null> {
  const { data } = await supabase
    .from('deals_cache')
    .select('payload, expires_at')
    .eq('key', key)
    .single();

  if (data && new Date(data.expires_at) > new Date()) {
    return data.payload;
  }
  return null;
}

async function setCache(supabase: any, key: string, payload: any): Promise<void> {
  const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();
  await supabase
    .from('deals_cache')
    .upsert({ key, payload, expires_at: expiresAt }, { onConflict: 'key' });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SERPAPI_KEY = Deno.env.get('SERPAPI_API_KEY');
    if (!SERPAPI_KEY) {
      throw new Error('SERPAPI_API_KEY not configured');
    }

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

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allowed = await checkRateLimit(supabase, user.id);
    if (!allowed) {
      return new Response(
        JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again in a minute.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'imageUrl is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check cache
    const cacheKey = hashKey(imageUrl);
    const cached = await getCache(supabase, cacheKey);
    if (cached) {
      console.log(`[deals-from-image] Cache hit`);
      return new Response(
        JSON.stringify({ ...cached, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[deals-from-image] Processing image for user ${user.id}: ${imageUrl.substring(0, 100)}...`);

    // Call Google Lens
    const lensParams = new URLSearchParams({
      engine: 'google_lens',
      url: imageUrl,
      api_key: SERPAPI_KEY,
      gl: 'ae',
      hl: 'en',
    });

    console.log('[deals-from-image] Calling Google Lens API...');
    const lensResponse = await fetch(`https://serpapi.com/search?${lensParams.toString()}`);
    const lensData = await lensResponse.json();

    if (lensData.error) {
      console.error('[deals-from-image] Lens API error:', lensData.error);
      throw new Error(`Lens API error: ${lensData.error}`);
    }

    const visualMatches: LensVisualMatch[] = (lensData.visual_matches || [])
      .slice(0, 5)
      .filter((match: any) => {
        const source = (match.source || '').toLowerCase();
        return !source.includes('pinterest') && !source.includes('instagram');
      })
      .map((match: any) => ({
        title: match.title || '',
        link: match.link || '',
        thumbnail: match.thumbnail || '',
        source: match.source || '',
      }));

    console.log(`[deals-from-image] Found ${visualMatches.length} visual matches`);

    const allShoppingResults: ShoppingResult[] = [];
    const seenLinks = new Set<string>();

    const searchQueries = visualMatches.slice(0, 3).map(m => m.title).filter(Boolean);
    
    if (searchQueries.length === 0 && lensData.knowledge_graph?.title) {
      searchQueries.push(lensData.knowledge_graph.title);
    }

    for (const query of searchQueries) {
      if (!query) continue;

      const shoppingParams = new URLSearchParams({
        engine: 'google_shopping',
        q: query,
        api_key: SERPAPI_KEY,
        gl: 'ae',
        hl: 'en',
        location: 'United Arab Emirates',
      });

      console.log(`[deals-from-image] Searching shopping: "${query.substring(0, 50)}..."`);
      
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
              position: result.position || allShoppingResults.length + 1,
            });
          }
        }
      } catch (err) {
        console.error(`[deals-from-image] Shopping search error for query "${query}":`, err);
      }
    }

    console.log(`[deals-from-image] Total shopping results: ${allShoppingResults.length}`);

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
      const filtered = sorted.filter(p => p >= median * 0.1 && p <= median * 5);
      
      if (filtered.length >= 5) {
        priceStats.low = filtered[Math.floor(filtered.length * 0.25)];
        priceStats.median = filtered[Math.floor(filtered.length * 0.5)];
        priceStats.high = filtered[Math.floor(filtered.length * 0.75)];
      }
    }

    allShoppingResults.sort((a, b) => {
      if (a.extracted_price === null) return 1;
      if (b.extracted_price === null) return -1;
      return a.extracted_price - b.extracted_price;
    });

    const response: DealsResponse = {
      success: true,
      input_image: imageUrl,
      visual_matches: visualMatches,
      shopping_results: allShoppingResults,
      price_stats: priceStats,
      deals_found: allShoppingResults.length,
    };

    // Cache the response
    await setCache(supabase, cacheKey, response);

    console.log(`[deals-from-image] Success: ${allShoppingResults.length} deals found`);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[deals-from-image] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        visual_matches: [],
        shopping_results: [],
        price_stats: { low: null, median: null, high: null, valid_count: 0 },
        deals_found: 0,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
