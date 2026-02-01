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

// ProductContext interface (matches src/types/ProductContext.ts)
interface ProductContext {
  page_url: string;
  extracted_from: 'chrome_ext' | 'safari_ext' | 'azyah_webview' | 'photo_upload' | 'url_paste';
  title?: string;
  brand?: string;
  price?: number;
  currency?: string;
  main_image_url?: string;
  image_urls?: string[];
  category_hint?: string;
  availability?: string;
  extraction_confidence?: 'high' | 'medium' | 'low';
}

interface DebugInfo {
  used_image_url: string | null;
  image_downloaded: boolean;
  original_image_url: string | null;
  roi_used: boolean;
  visual_rerank_applied: boolean;
  pattern_mode: boolean;
  filtered_count: number;
}

interface VisualMatch {
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
  similarity_score?: number;
}

interface PipelineLog {
  input_has_image: boolean;
  query_pack_count: number;
  raw_results_count: number;
  after_dedupe_count: number;
  final_returned_count: number;
  used_fallback_queries: boolean;
  visual_rerank_applied: boolean;
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
  return `ctx_${Math.abs(hash).toString(36)}`;
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

function buildQueryPack(
  context: ProductContext,
  visualMatchTitles: string[]
): string[] {
  const queries: string[] = [];
  
  // Combine context title with visual match titles
  const allTitles = [...(context.title ? [context.title] : []), ...visualMatchTitles];
  const { colors, categories, silhouettes, fabrics } = extractDescriptors(allTitles);
  
  // Use context hints if available
  const primaryColor = colors[0] || '';
  const primaryCategory = context.category_hint || categories[0] || '';
  const primarySilhouette = silhouettes[0] || '';
  const primaryFabric = fabrics[0] || '';
  
  // Core locked queries (category + color)
  if (primaryCategory && primaryColor) {
    queries.push(`${primaryColor} ${primaryCategory}`.trim());
    
    if (primarySilhouette) {
      queries.push(`${primaryColor} ${primarySilhouette} ${primaryCategory}`.trim());
    }
    
    if (primaryFabric) {
      queries.push(`${primaryFabric} ${primaryCategory} ${primaryColor}`.trim());
    }
  }
  
  // Brand-specific query (only if high confidence)
  if (context.brand && primaryCategory && context.extraction_confidence === 'high') {
    queries.push(`${context.brand} ${primaryCategory}`.trim());
  }
  
  // Context title as query
  if (context.title) {
    const cleanTitle = context.title
      .replace(/\s*[-|]\s*[^-|]+$/, '')
      .replace(/\b(free shipping|sale|discount|off)\b/gi, '')
      .trim();
    if (cleanTitle.length > 5 && !queries.includes(cleanTitle)) {
      queries.push(cleanTitle);
    }
  }
  
  // Visual match titles (cleaned)
  for (const title of visualMatchTitles.slice(0, 3)) {
    const cleanTitle = title
      .replace(/\s*[-|]\s*[^-|]+$/, '')
      .replace(/\b(free shipping|sale|discount|off)\b/gi, '')
      .trim();
    if (cleanTitle.length > 5 && !queries.includes(cleanTitle)) {
      queries.push(cleanTitle);
    }
  }
  
  return [...new Set(queries)].filter(q => q.length > 3).slice(0, 10);
}

function buildStylePackQueries(
  categories: string[],
  colors: string[],
  silhouettes: string[]
): string[] {
  const queries: string[] = [];
  const category = categories[0] || 'modest dress';
  
  for (const color of colors.slice(0, 2)) {
    queries.push(`${color} ${category}`);
  }
  
  for (const silhouette of silhouettes.slice(0, 2)) {
    queries.push(`${silhouette} ${category}`);
  }
  
  queries.push(`${category} UAE`);
  queries.push(`modest ${category}`);
  
  return [...new Set(queries)].slice(0, 4);
}

// Visual heuristic re-ranking based on color and category matching
function computeSimilarityScore(
  result: any,
  inputColors: string[],
  inputCategories: string[]
): number {
  let score = 0;
  const resultTitle = (result.title || '').toLowerCase();
  const resultSource = (result.source || '').toLowerCase();
  
  // Color matching (0.4 weight)
  for (const color of inputColors) {
    if (resultTitle.includes(color)) {
      score += 0.4;
      break;
    }
  }
  
  // Category matching (0.4 weight)
  for (const category of inputCategories) {
    if (resultTitle.includes(category)) {
      score += 0.4;
      break;
    }
  }
  
  // Source quality bonus (0.2 weight) - prefer known fashion retailers
  const premiumSources = ['namshi', 'ounass', 'farfetch', 'asos', 'zara', 'nike'];
  const goodSources = ['noon', 'amazon', 'shein'];
  
  for (const src of premiumSources) {
    if (resultSource.includes(src)) {
      score += 0.2;
      break;
    }
  }
  if (score < 0.2) {
    for (const src of goodSources) {
      if (resultSource.includes(src)) {
        score += 0.1;
        break;
      }
    }
  }
  
  return Math.min(score, 1);
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

    const { context } = await req.json() as { context: ProductContext };

    if (!context?.page_url) {
      return new Response(
        JSON.stringify({ success: false, error: 'ProductContext with page_url is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build cache key from context
    const cacheInput = JSON.stringify({
      url: context.page_url,
      image: context.main_image_url,
      title: context.title,
    });
    const cacheKey = hashKey(cacheInput);
    
    const cached = await getCache(supabase, cacheKey);
    if (cached) {
      console.log(`[deals-from-context] Cache hit`);
      return new Response(
        JSON.stringify({ ...cached, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[deals-from-context] Processing context for user ${user.id}:`, {
      page_url: context.page_url,
      extracted_from: context.extracted_from,
      has_image: !!context.main_image_url,
      has_title: !!context.title,
    });

    // Initialize debug info
    const debugInfo: DebugInfo = {
      used_image_url: null,
      image_downloaded: false,
      original_image_url: context.main_image_url || null,
      roi_used: false,
      visual_rerank_applied: false,
      pattern_mode: false,
      filtered_count: 0,
    };

    const pipelineLog: PipelineLog = {
      input_has_image: !!context.main_image_url,
      query_pack_count: 0,
      raw_results_count: 0,
      after_dedupe_count: 0,
      final_returned_count: 0,
      used_fallback_queries: false,
      visual_rerank_applied: false,
    };

    const allShoppingResults: ShoppingResult[] = [];
    const seenKeys = new Set<string>();
    const visualMatches: VisualMatch[] = [];
    const visualMatchTitles: string[] = [];

    // Step 0: For extension sources, download external image server-side to avoid hotlinking blocks
    let imageToSearch = context.main_image_url || (context.image_urls?.[0]);
    
    if (imageToSearch && (context.extracted_from === 'chrome_ext' || context.extracted_from === 'safari_ext')) {
      // Check if image is from an external domain (not our own storage)
      const isExternalImage = imageToSearch.startsWith('https://') && 
        !imageToSearch.includes('supabase.co') && 
        !imageToSearch.includes('lovable.app');
      
      if (isExternalImage) {
        console.log(`[deals-from-context] Downloading external image for extension...`);
        
        try {
          const imageResponse = await fetch(imageToSearch, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; AzyahBot/1.0; +https://azyah.com)',
              'Accept': 'image/*',
            }
          });
          
          if (imageResponse.ok) {
            const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
            const imageBlob = await imageResponse.blob();
            
            // Only process if it's actually an image and not too large (8MB max)
            if (contentType.startsWith('image/') && imageBlob.size < 8 * 1024 * 1024) {
              const imageBuffer = await imageBlob.arrayBuffer();
              const ext = contentType.includes('png') ? 'png' : 'jpg';
              const imagePath = `ext/${user.id}/${crypto.randomUUID()}.${ext}`;
              
              // Upload to deals-uploads bucket
              const { error: uploadError } = await supabase.storage
                .from('deals-uploads')
                .upload(imagePath, imageBuffer, {
                  contentType,
                  upsert: false,
                });
              
              if (!uploadError) {
                // Generate signed URL for Lens (15 min expiry)
                const { data: signedUrlData } = await supabase.storage
                  .from('deals-uploads')
                  .createSignedUrl(imagePath, 900);
                
                if (signedUrlData?.signedUrl) {
                  imageToSearch = signedUrlData.signedUrl;
                  debugInfo.image_downloaded = true;
                  debugInfo.used_image_url = imageToSearch;
                  console.log(`[deals-from-context] Image downloaded and stored successfully`);
                }
              } else {
                console.warn(`[deals-from-context] Image upload failed:`, uploadError);
              }
            }
          }
        } catch (imgErr) {
          console.warn(`[deals-from-context] Image download failed:`, imgErr);
          // Continue with original URL as fallback
        }
      }
    }

    // Step 1: If we have an image, run Google Lens
    if (imageToSearch) {
      console.log(`[deals-from-context] Running Lens on image...`);
      debugInfo.used_image_url = debugInfo.used_image_url || imageToSearch;
      
      try {
        const lensParams = new URLSearchParams({
          engine: 'google_lens',
          url: imageToSearch,
          api_key: SERPAPI_KEY,
          gl: 'ae',
          hl: 'en',
        });

        const lensResponse = await fetch(`https://serpapi.com/search?${lensParams.toString()}`);
        const lensData = await lensResponse.json();

        if (!lensData.error) {
          const matches = (lensData.visual_matches || [])
            .slice(0, 10)
            .filter((match: any) => {
              const source = (match.source || '').toLowerCase();
              return !source.includes('pinterest') && !source.includes('instagram');
            });

          for (const match of matches) {
            visualMatches.push({
              title: match.title || '',
              link: normalizeLink(match.link),
              thumbnail: match.thumbnail || '',
              source: match.source || '',
            });
            if (match.title) {
              visualMatchTitles.push(match.title);
            }
          }

          console.log(`[deals-from-context] Lens found ${visualMatches.length} visual matches`);
        }
      } catch (err) {
        console.warn('[deals-from-context] Lens error:', err);
      }
    }

    // Step 2: Build query pack
    const searchQueries = buildQueryPack(context, visualMatchTitles);
    pipelineLog.query_pack_count = searchQueries.length;
    
    console.log(`[deals-from-context] Query pack (${searchQueries.length}): ${searchQueries.slice(0, 3).join(' | ')}...`);

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
        console.warn(`[deals-from-context] Shopping search error:`, err);
      }
    }

    pipelineLog.after_dedupe_count = allShoppingResults.length;

    // Step 4: Result floor strategy
    if (allShoppingResults.length < MIN_RESULTS_FLOOR) {
      console.log(`[deals-from-context] Below result floor (${allShoppingResults.length}), running style pack...`);
      pipelineLog.used_fallback_queries = true;
      
      const allTitles = [...(context.title ? [context.title] : []), ...visualMatchTitles];
      const { colors, categories, silhouettes } = extractDescriptors(allTitles);
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
          console.warn(`[deals-from-context] Style pack error:`, err);
        }
      }
    }

    // Step 5: Visual heuristic re-ranking
    const allTitles = [...(context.title ? [context.title] : []), ...visualMatchTitles];
    const { colors: inputColors, categories: inputCategories } = extractDescriptors(allTitles);
    
    if (inputColors.length > 0 || inputCategories.length > 0) {
      pipelineLog.visual_rerank_applied = true;
      
      // Compute similarity scores
      for (const result of allShoppingResults) {
        result.similarity_score = computeSimilarityScore(result, inputColors, inputCategories);
      }
      
      // Sort by similarity score first, then by price
      allShoppingResults.sort((a, b) => {
        const scoreA = a.similarity_score ?? 0;
        const scoreB = b.similarity_score ?? 0;
        
        if (Math.abs(scoreA - scoreB) > 0.1) {
          return scoreB - scoreA; // Higher similarity first
        }
        
        // Same similarity tier - sort by price
        if (a.extracted_price === null) return 1;
        if (b.extracted_price === null) return -1;
        return a.extracted_price - b.extracted_price;
      });
      
      console.log(`[deals-from-context] Applied visual rerank: colors=[${inputColors.slice(0, 2).join(',')}], categories=[${inputCategories.slice(0, 2).join(',')}]`);
    } else {
      // Fallback to price-only sort
      allShoppingResults.sort((a, b) => {
        if (a.extracted_price === null) return 1;
        if (b.extracted_price === null) return -1;
        return a.extracted_price - b.extracted_price;
      });
    }

    // Update positions after sorting
    allShoppingResults.forEach((result, index) => {
      result.position = index + 1;
    });

    pipelineLog.final_returned_count = allShoppingResults.length;

    console.log(`[deals-from-context] Pipeline: input_has_image=${pipelineLog.input_has_image}, query_pack=${pipelineLog.query_pack_count}, raw=${pipelineLog.raw_results_count}, dedupe=${pipelineLog.after_dedupe_count}, final=${pipelineLog.final_returned_count}, rerank=${pipelineLog.visual_rerank_applied}`);

    // Compute price stats
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

    // Build suggestion
    let suggestion: string | undefined;
    if (allShoppingResults.length === 0) {
      suggestion = 'Try using "Open in Azyah" for better product extraction.';
    } else if (allShoppingResults.length < 5 && !context.main_image_url) {
      suggestion = 'For more results, try the Photo tab with a product image.';
    }

    const response = {
      success: true,
      input_context: context,
      visual_matches: visualMatches,
      shopping_results: allShoppingResults,
      price_stats: priceStats,
      deals_found: allShoppingResults.length,
      pipeline_log: pipelineLog,
      debug: debugInfo,
      suggestion,
    };

    await setCache(supabase, cacheKey, response);

    console.log(`[deals-from-context] Success: ${allShoppingResults.length} deals found`);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[deals-from-context] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        input_context: {},
        visual_matches: [],
        shopping_results: [],
        price_stats: { low: null, median: null, high: null, valid_count: 0 },
        deals_found: 0,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
