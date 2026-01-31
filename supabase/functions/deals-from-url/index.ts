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
  pipeline_log?: PipelineLog;
  cached?: boolean;
  error?: string;
  suggestion?: string;
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
  return `url_${Math.abs(hash).toString(36)}`;
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
function buildQueryPack(
  visualMatchTitles: string[],
  urlBrand: string | null,
  urlProductHint: string | null
): string[] {
  const queries: string[] = [];
  const { colors, categories, silhouettes, fabrics } = extractDescriptors(visualMatchTitles);
  
  // Use first matches as defaults
  const primaryColor = colors[0] || '';
  const primaryCategory = categories[0] || '';
  const primarySilhouette = silhouettes[0] || '';
  const primaryFabric = fabrics[0] || '';
  
  // If we have category + color, create locked queries
  if (primaryCategory && primaryColor) {
    // Core locked query
    queries.push(`${primaryColor} ${primaryCategory}`.trim());
    
    // Add silhouette variant
    if (primarySilhouette) {
      queries.push(`${primaryColor} ${primarySilhouette} ${primaryCategory}`.trim());
    }
    
    // Add fabric variant
    if (primaryFabric) {
      queries.push(`${primaryFabric} ${primaryCategory} ${primaryColor}`.trim());
    }
  }
  
  // Add brand-specific query only if confident
  if (urlBrand && primaryCategory) {
    queries.push(`${urlBrand} ${primaryCategory}`.trim());
  }
  
  // Use raw visual match titles (first 3 only)
  for (const title of visualMatchTitles.slice(0, 3)) {
    if (title && !queries.includes(title)) {
      queries.push(title);
    }
  }
  
  // URL-derived hint as fallback
  if (urlProductHint && queries.length < 3) {
    queries.push(urlProductHint);
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

// Extract brand from URL hostname
function extractBrandFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '').toLowerCase();
    
    if (hostname.includes('asos')) return 'ASOS';
    if (hostname.includes('nike')) return 'Nike';
    if (hostname.includes('zara')) return 'Zara';
    if (hostname.includes('hm.com') || hostname.includes('h&m')) return 'H&M';
    if (hostname.includes('amazon')) return 'Amazon';
    if (hostname.includes('shein')) return 'Shein';
    if (hostname.includes('namshi')) return 'Namshi';
    if (hostname.includes('noon')) return 'Noon';
    if (hostname.includes('ounass')) return 'Ounass';
    if (hostname.includes('farfetch')) return 'Farfetch';
    if (hostname.includes('ssense')) return 'SSENSE';
    if (hostname.includes('matchesfashion')) return 'MATCHES';
    
    // Capitalize first letter of domain
    const domain = hostname.split('.')[0];
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  } catch {
    return '';
  }
}

// Extract product hint from URL path
function extractProductHintFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    
    // Find the most product-like path segment
    const productSegment = pathParts.find(part => 
      part.includes('-') && 
      part.length > 10 && 
      !part.startsWith('prd') && 
      !/^\d+$/.test(part)
    ) || pathParts[pathParts.length - 1];
    
    if (productSegment) {
      let cleanQuery = productSegment
        .replace(/[-_]/g, ' ')
        .replace(/\b(prd|colourwayid|colorwayid|sku|id|clid)\b/gi, '')
        .replace(/\d{6,}/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Remove brand prefixes
      cleanQuery = cleanQuery.replace(/^asos\s*(design)?\s*/i, '');
      cleanQuery = cleanQuery.replace(/^nike\s*/i, '');
      cleanQuery = cleanQuery.replace(/^zara\s*/i, '');
      
      if (cleanQuery.length > 5) {
        return cleanQuery;
      }
    }
  } catch {
    // Ignore URL parsing errors
  }
  return null;
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

    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'url is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check cache
    const cacheKey = hashKey(url.toLowerCase());
    const cached = await getCache(supabase, cacheKey);
    if (cached) {
      console.log(`[deals-from-url] Cache hit for URL`);
      return new Response(
        JSON.stringify({ ...cached, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[deals-from-url] Processing URL for user ${user.id}: ${url}`);

    // Initialize pipeline logging
    const pipelineLog: PipelineLog = {
      input_has_image: false,
      query_pack_count: 0,
      raw_results_count: 0,
      after_dedupe_count: 0,
      final_returned_count: 0,
      used_fallback_queries: false,
    };

    // Extract brand and product hint from URL (NO server-side scraping)
    const urlBrand = extractBrandFromUrl(url);
    const urlProductHint = extractProductHintFromUrl(url);
    
    let extractedProduct = { 
      title: urlProductHint, 
      image: null as string | null, 
      brand: urlBrand || null 
    };

    const allShoppingResults: ShoppingResult[] = [];
    const seenKeys = new Set<string>();
    const visualMatchTitles: string[] = [];

    // Step 1: Try Google Lens on the URL directly (treats URL as image source)
    // This works when URL contains og:image or redirects to an image
    console.log(`[deals-from-url] Running Google Lens on URL...`);
    
    try {
      const lensParams = new URLSearchParams({
        engine: 'google_lens',
        url: url,
        api_key: SERPAPI_KEY,
        gl: 'ae',
        hl: 'en',
      });

      const lensResponse = await fetch(`https://serpapi.com/search?${lensParams.toString()}`);
      const lensData = await lensResponse.json();

      if (!lensData.error) {
        // Extract og:image if returned by Lens
        if (lensData.image_source?.url) {
          extractedProduct.image = lensData.image_source.url;
          pipelineLog.input_has_image = true;
        }

        const visualMatches = (lensData.visual_matches || [])
          .slice(0, 8)
          .filter((match: any) => {
            const source = (match.source || '').toLowerCase();
            return !source.includes('pinterest') && !source.includes('instagram');
          });

        console.log(`[deals-from-url] Lens found ${visualMatches.length} visual matches`);

        for (const match of visualMatches) {
          if (match.title) {
            visualMatchTitles.push(match.title);
          }
        }
        
        // Use knowledge graph for product title if available
        if (lensData.knowledge_graph?.title) {
          extractedProduct.title = lensData.knowledge_graph.title;
        }
      }
    } catch (err) {
      console.warn('[deals-from-url] Lens API error:', err);
    }

    // Step 2: Build descriptive query pack with category/color/silhouette locking
    const shoppingQueries = buildQueryPack(visualMatchTitles, urlBrand, urlProductHint);
    pipelineLog.query_pack_count = shoppingQueries.length;
    
    console.log(`[deals-from-url] Query pack (${shoppingQueries.length}): ${shoppingQueries.slice(0, 3).join(' | ')}...`);

    // Step 3: Run shopping searches
    for (const query of shoppingQueries.slice(0, 6)) {
      if (!query) continue;

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
        console.warn(`[deals-from-url] Shopping search error:`, err);
      }
    }

    pipelineLog.after_dedupe_count = allShoppingResults.length;

    // Step 4: Result floor strategy - if below minimum, run broader style pack
    if (allShoppingResults.length < MIN_RESULTS_FLOOR && visualMatchTitles.length > 0) {
      console.log(`[deals-from-url] Below result floor (${allShoppingResults.length}), running style pack...`);
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
          console.warn(`[deals-from-url] Style pack search error:`, err);
        }
      }
    }

    pipelineLog.final_returned_count = allShoppingResults.length;
    
    console.log(`[deals-from-url] Pipeline: input_has_image=${pipelineLog.input_has_image}, query_pack=${pipelineLog.query_pack_count}, raw=${pipelineLog.raw_results_count}, dedupe=${pipelineLog.after_dedupe_count}, final=${pipelineLog.final_returned_count}`);

    // Build suggestion for better results
    let suggestion: string | undefined;
    if (allShoppingResults.length === 0) {
      suggestion = 'For best results, try uploading a photo of the product instead.';
    } else if (allShoppingResults.length < 5) {
      suggestion = 'For more results, try the Photo tab with a product image.';
    }

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

    // Sort by price (will be replaced by visual similarity in future)
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
      pipeline_log: pipelineLog,
      suggestion,
    };

    // Cache the response
    await setCache(supabase, cacheKey, response);

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
        input_url: '',
        extracted_product: { title: null, image: null, brand: null },
        shopping_results: [],
        price_stats: { low: null, median: null, high: null, valid_count: 0 },
        deals_found: 0,
        suggestion: 'For best results, try uploading a photo of the product instead.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
