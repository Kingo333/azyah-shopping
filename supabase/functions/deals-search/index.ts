import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

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
  cached?: boolean;
  error?: string;
}

// Simple hash function for cache keys
function hashKey(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `search_${Math.abs(hash).toString(36)}`;
}

// Normalize link to handle // or www. prefixes
function normalizeLink(link: string | undefined | null): string {
  if (!link) return '';
  let normalized = link.trim();
  if (normalized.startsWith('//')) {
    normalized = 'https:' + normalized;
  } else if (normalized.startsWith('www.')) {
    normalized = 'https://' + normalized;
  }
  return normalized;
}

// Extract numeric price from string like "AED 599.00" or "$49.99"
function extractNumericPrice(priceStr: string | undefined | null): number | null {
  if (!priceStr) return null;
  const match = priceStr.replace(/,/g, '').match(/[\d.]+/);
  return match ? parseFloat(match[0]) : null;
}

// Robust dedup key that handles empty links
function dedupKey(result: any): string {
  const link = normalizeLink(result.link);
  const productId = (result.product_id || '').trim();
  
  // Priority 1: Valid URL link
  if (link && link.startsWith('http')) {
    return `link:${link}`;
  }
  
  // Priority 2: Product ID
  if (productId) {
    return `pid:${productId}`;
  }
  
  // Priority 3: Composite key (source + normalized price + title prefix)
  const source = (result.source || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
  const price = result.extracted_price ?? extractNumericPrice(result.price) ?? 0;
  const title = (result.title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
  
  return `mix:${source}|${price}|${title}`;
}

// Merge all shopping-related arrays from SerpApi response
function mergeShoppingArrays(data: any): any[] {
  return [
    ...(data.shopping_results || []),
    ...(data.inline_shopping_results || []),
    ...(data.sponsored_shopping_results || []),
    ...(data.related_shopping_results || []),
  ];
}

async function checkRateLimit(supabase: any, userId: string): Promise<boolean> {
  const windowStart = new Date(Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS);
  
  // Try to increment or insert
  const { data, error } = await supabase
    .from('deals_rate_limit')
    .upsert(
      { user_id: userId, window_start: windowStart.toISOString(), request_count: 1 },
      { onConflict: 'user_id,window_start', ignoreDuplicates: false }
    )
    .select('request_count')
    .single();

  if (error) {
    // If upsert failed, try to get existing and increment
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
    }
    return true;
  }

  // Check if we hit the upsert successfully and need to increment
  if (data && data.request_count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  // Increment the count
  await supabase
    .from('deals_rate_limit')
    .update({ request_count: (data?.request_count || 0) + 1 })
    .eq('user_id', userId)
    .eq('window_start', windowStart.toISOString());

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

    // Check rate limit
    const allowed = await checkRateLimit(supabase, user.id);
    if (!allowed) {
      return new Response(
        JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again in a minute.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Check cache
    const cacheKey = hashKey(`${q.trim().toLowerCase()}_${sort_by || ''}`);
    const cached = await getCache(supabase, cacheKey);
    if (cached) {
      console.log(`[deals-search] Cache hit for "${q.substring(0, 30)}..."`);
      return new Response(
        JSON.stringify({ ...cached, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[deals-search] Searching for user ${user.id}: "${q}"`);

    const allShoppingResults: ShoppingResult[] = [];
    const seenKeys = new Set<string>();
    let usedLensFallback = false;
    let rawResultCount = 0;

    // Step 1: Call Google Shopping via SerpApi
    const params = new URLSearchParams({
      engine: 'google_shopping',
      q: q.trim(),
      api_key: SERPAPI_KEY,
      gl: 'ae',
      hl: 'en',
      location: 'United Arab Emirates',
    });

    if (sort_by === 1 || sort_by === 2) {
      params.set('tbs', sort_by === 1 ? 'p_ord:p' : 'p_ord:pd');
    }

    const shoppingResponse = await fetch(`https://serpapi.com/search?${params.toString()}`);
    const shoppingData = await shoppingResponse.json();

    if (shoppingData.error) {
      throw new Error(`Shopping API error: ${shoppingData.error}`);
    }

    // Merge ALL shopping arrays from response
    const initialResults = mergeShoppingArrays(shoppingData);
    rawResultCount += initialResults.length;

    for (const result of initialResults.slice(0, 40)) {
      const key = dedupKey(result);
      if (!key || seenKeys.has(key)) continue;
      seenKeys.add(key);

      allShoppingResults.push({
        title: result.title || '',
        link: normalizeLink(result.link),
        thumbnail: result.thumbnail || '',
        source: result.source || '',
        price: result.price || '',
        extracted_price: result.extracted_price ?? extractNumericPrice(result.price),
        rating: result.rating || undefined,
        reviews: result.reviews || undefined,
        position: allShoppingResults.length + 1,
      });
    }

    console.log(`[deals-search] Initial results: raw=${rawResultCount}, after_dedupe=${allShoppingResults.length}`);

    // Step 2: Lens fallback if <10 results (increased from 5)
    if (allShoppingResults.length < 10 && allShoppingResults.length > 0) {
      const topResult = allShoppingResults[0];
      
      if (topResult.thumbnail) {
        console.log(`[deals-search] Running Lens fallback...`);
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
              .slice(0, 8) // Increased from 5 to 8
              .filter((match: any) => {
                const source = (match.source || '').toLowerCase();
                return !source.includes('pinterest') && !source.includes('instagram');
              });

            // Use up to 5 visual match titles for expanded searches
            for (const match of visualMatches.slice(0, 5)) {
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

                // Merge ALL shopping arrays
                const expandResults = mergeShoppingArrays(expandData);
                rawResultCount += expandResults.length;

                for (const result of expandResults.slice(0, 12)) {
                  const key = dedupKey(result);
                  if (!key || seenKeys.has(key)) continue;
                  seenKeys.add(key);

                  allShoppingResults.push({
                    title: result.title || '',
                    link: normalizeLink(result.link),
                    thumbnail: result.thumbnail || '',
                    source: result.source || '',
                    price: result.price || '',
                    extracted_price: result.extracted_price ?? extractNumericPrice(result.price),
                    rating: result.rating || undefined,
                    reviews: result.reviews || undefined,
                    position: allShoppingResults.length + 1,
                  });
                }
              } catch (err) {
                console.warn(`[deals-search] Expand search error:`, err);
              }
            }
          }
        } catch (err) {
          console.warn('[deals-search] Lens fallback error:', err);
        }
      }
    }

    console.log(`[deals-search] Pipeline: raw_total=${rawResultCount}, final_count=${allShoppingResults.length}`);

    // Step 3: Compute price statistics
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

    // Cache the response
    await setCache(supabase, cacheKey, response);

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
