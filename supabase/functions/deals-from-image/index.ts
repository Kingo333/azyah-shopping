import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const CACHE_TTL_MS = 30 * 60 * 1000;
const MIN_RESULTS_FLOOR = 10;

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

interface PipelineLog {
  input_has_image: boolean;
  query_pack_count: number;
  raw_results_count: number;
  after_dedupe_count: number;
  final_returned_count: number;
  used_fallback_queries: boolean;
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
  pipeline_log?: PipelineLog;
  cached?: boolean;
  error?: string;
}

// Color vocabulary for modest fashion
const COLOR_WORDS = [
  'grey', 'gray', 'stone', 'beige', 'black', 'white', 'navy', 'blue', 
  'cream', 'camel', 'brown', 'green', 'pink', 'red', 'burgundy', 'maroon',
  'olive', 'khaki', 'nude', 'blush', 'coral', 'teal', 'emerald', 'gold',
  'silver', 'charcoal', 'sand', 'ivory', 'taupe', 'sage', 'rust', 'mustard'
];

// Category vocabulary for modest fashion
const CATEGORY_WORDS = [
  'abaya', 'kaftan', 'caftan', 'dress', 'outer', 'jacket', 'kimono',
  'jalabiya', 'jilbab', 'thobe', 'bisht', 'cardigan', 'coat', 'blazer',
  'modest', 'maxi', 'midi', 'gown', 'cape', 'poncho', 'tunic'
];

// Silhouette vocabulary
const SILHOUETTE_WORDS = [
  'open', 'open-front', 'kimono', 'butterfly', 'wide sleeve', 'bell sleeve',
  'loose', 'fitted', 'flowy', 'wrap', 'belted', 'a-line', 'straight',
  'oversized', 'relaxed', 'slim', 'tailored', 'draped', 'layered'
];

// Fabric vocabulary
const FABRIC_WORDS = [
  'satin', 'chiffon', 'linen', 'cotton', 'silk', 'crepe', 'georgette',
  'velvet', 'jersey', 'knit', 'denim', 'lace', 'embroidered', 'sequin'
];

function hashKey(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `img_${Math.abs(hash).toString(36)}`;
}

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

function extractNumericPrice(priceStr: string | undefined | null): number | null {
  if (!priceStr) return null;
  const match = priceStr.replace(/,/g, '').match(/[\d.]+/);
  return match ? parseFloat(match[0]) : null;
}

function dedupKey(result: any): string {
  const link = normalizeLink(result.link);
  const productId = (result.product_id || '').trim();
  
  if (link && link.startsWith('http')) {
    return `link:${link}`;
  }
  
  if (productId) {
    return `pid:${productId}`;
  }
  
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

function mergeShoppingArrays(data: any): any[] {
  return [
    ...(data.shopping_results || []),
    ...(data.inline_shopping_results || []),
    ...(data.sponsored_shopping_results || []),
    ...(data.related_shopping_results || []),
  ];
}

// Extract descriptive terms from visual match titles
function extractDescriptors(titles: string[]): {
  colors: string[];
  categories: string[];
  silhouettes: string[];
  fabrics: string[];
} {
  const allText = titles.join(' ').toLowerCase();
  
  const colors = COLOR_WORDS.filter(c => allText.includes(c));
  const categories = CATEGORY_WORDS.filter(c => allText.includes(c));
  const silhouettes = SILHOUETTE_WORDS.filter(s => allText.includes(s.toLowerCase()));
  const fabrics = FABRIC_WORDS.filter(f => allText.includes(f));
  
  return { colors, categories, silhouettes, fabrics };
}

// Build descriptive query pack with category/color/silhouette locking
function buildQueryPack(visualMatchTitles: string[]): string[] {
  const queries: string[] = [];
  const { colors, categories, silhouettes, fabrics } = extractDescriptors(visualMatchTitles);
  
  const primaryColor = colors[0] || '';
  const primaryCategory = categories[0] || '';
  const primarySilhouette = silhouettes[0] || '';
  const primaryFabric = fabrics[0] || '';
  
  // Core locked queries (category + color)
  if (primaryCategory && primaryColor) {
    queries.push(`${primaryColor} ${primaryCategory}`.trim());
    
    // Silhouette variant
    if (primarySilhouette) {
      queries.push(`${primaryColor} ${primarySilhouette} ${primaryCategory}`.trim());
    }
    
    // Fabric variant
    if (primaryFabric) {
      queries.push(`${primaryFabric} ${primaryCategory} ${primaryColor}`.trim());
    }
    
    // Second color variant
    if (colors[1]) {
      queries.push(`${colors[1]} ${primaryCategory}`.trim());
    }
  }
  
  // Use raw visual match titles (first 4)
  for (const title of visualMatchTitles.slice(0, 4)) {
    if (title && !queries.includes(title)) {
      // Clean up noisy titles
      const cleanTitle = title
        .replace(/\s*[-|]\s*[^-|]+$/, '') // Remove trailing brand/site
        .replace(/\b(free shipping|sale|discount|off)\b/gi, '')
        .trim();
      if (cleanTitle.length > 5) {
        queries.push(cleanTitle);
      }
    }
  }
  
  // Dedupe and limit
  const uniqueQueries = [...new Set(queries)].filter(q => q.length > 3);
  return uniqueQueries.slice(0, 10);
}

// Build broader "style pack" queries when results are low
function buildStylePackQueries(
  categories: string[],
  colors: string[],
  silhouettes: string[]
): string[] {
  const queries: string[] = [];
  const category = categories[0] || 'modest dress';
  
  // Category + color
  for (const color of colors.slice(0, 2)) {
    queries.push(`${color} ${category}`);
  }
  
  // Category + silhouette
  for (const silhouette of silhouettes.slice(0, 2)) {
    queries.push(`${silhouette} ${category}`);
  }
  
  // Generic fallbacks
  queries.push(`${category} UAE`);
  queries.push(`modest ${category}`);
  
  return [...new Set(queries)].slice(0, 4);
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

    // Initialize pipeline logging
    const pipelineLog: PipelineLog = {
      input_has_image: true,
      query_pack_count: 0,
      raw_results_count: 0,
      after_dedupe_count: 0,
      final_returned_count: 0,
      used_fallback_queries: false,
    };

    // Step 1: Call Google Lens
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
      .slice(0, 10)
      .filter((match: any) => {
        const source = (match.source || '').toLowerCase();
        return !source.includes('pinterest') && !source.includes('instagram');
      })
      .map((match: any) => ({
        title: match.title || '',
        link: normalizeLink(match.link),
        thumbnail: match.thumbnail || '',
        source: match.source || '',
      }));

    console.log(`[deals-from-image] Found ${visualMatches.length} visual matches`);

    // Extract titles for query pack building
    const visualMatchTitles = visualMatches.map(m => m.title).filter(Boolean);
    
    // Add knowledge graph title if available
    if (lensData.knowledge_graph?.title) {
      visualMatchTitles.unshift(lensData.knowledge_graph.title);
    }

    // Step 2: Build descriptive query pack with category/color/silhouette locking
    const searchQueries = buildQueryPack(visualMatchTitles);
    pipelineLog.query_pack_count = searchQueries.length;
    
    console.log(`[deals-from-image] Query pack (${searchQueries.length}): ${searchQueries.slice(0, 3).join(' | ')}...`);

    const allShoppingResults: ShoppingResult[] = [];
    const seenKeys = new Set<string>();

    // Step 3: Run shopping searches
    for (const query of searchQueries.slice(0, 6)) {
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

        const allResults = mergeShoppingArrays(shoppingData);
        pipelineLog.raw_results_count += allResults.length;

        for (const result of allResults.slice(0, 15)) {
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
        console.error(`[deals-from-image] Shopping search error for query "${query}":`, err);
      }
    }

    pipelineLog.after_dedupe_count = allShoppingResults.length;

    // Step 4: Result floor strategy - if below minimum, run broader style pack
    if (allShoppingResults.length < MIN_RESULTS_FLOOR && visualMatchTitles.length > 0) {
      console.log(`[deals-from-image] Below result floor (${allShoppingResults.length}), running style pack...`);
      pipelineLog.used_fallback_queries = true;
      
      const { colors, categories, silhouettes } = extractDescriptors(visualMatchTitles);
      const stylePackQueries = buildStylePackQueries(categories, colors, silhouettes);
      
      for (const query of stylePackQueries) {
        const shoppingParams = new URLSearchParams({
          engine: 'google_shopping',
          q: query,
          api_key: SERPAPI_KEY,
          gl: 'ae',
          hl: 'en',
          location: 'United Arab Emirates',
        });

        try {
          const shoppingResponse = await fetch(`https://serpapi.com/search?${shoppingParams.toString()}`);
          const shoppingData = await shoppingResponse.json();

          const allResults = mergeShoppingArrays(shoppingData);
          pipelineLog.raw_results_count += allResults.length;

          for (const result of allResults.slice(0, 10)) {
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
          console.warn(`[deals-from-image] Style pack search error:`, err);
        }
      }
    }

    pipelineLog.final_returned_count = allShoppingResults.length;

    console.log(`[deals-from-image] Pipeline: input_has_image=${pipelineLog.input_has_image}, query_pack=${pipelineLog.query_pack_count}, raw=${pipelineLog.raw_results_count}, dedupe=${pipelineLog.after_dedupe_count}, final=${pipelineLog.final_returned_count}`);

    // Step 5: Compute price statistics
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

    // Sort by price (will be replaced by visual similarity ranking in Phase 2)
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
      pipeline_log: pipelineLog,
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
