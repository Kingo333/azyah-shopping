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
  similarity_score?: number;
}

interface PipelineLog {
  input_has_image: boolean;
  query_pack_count: number;
  raw_results_count: number;
  after_dedupe_count: number;
  final_returned_count: number;
  used_fallback_queries: boolean;
  brands_detected?: string[];
  patterns_detected?: string[];
  // NEW: Enhanced instrumentation
  lens_calls_count?: number;
  visual_rerank_applied?: boolean;
  azyah_similar_count?: number;
  top_5_results?: Array<{ title: string; thumb: string; final_score: number }>;
  pattern_mode?: boolean;
  visual_filtered_count?: number;
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
  'silver', 'charcoal', 'sand', 'ivory', 'taupe', 'sage', 'rust', 'mustard',
  'multicolor', 'multi-color', 'multicolored', 'multi'
];

// Category vocabulary for modest fashion
const CATEGORY_WORDS = [
  'abaya', 'kaftan', 'caftan', 'dress', 'outer', 'jacket', 'kimono',
  'jalabiya', 'jilbab', 'thobe', 'bisht', 'cardigan', 'coat', 'blazer',
  'modest', 'maxi', 'midi', 'gown', 'cape', 'poncho', 'tunic',
  'robe', 'wrap', 'duster', 'overcoat', 'trench'
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

// NEW: Pattern vocabulary for print/texture identification
const PATTERN_WORDS = [
  // Prints
  'printed', 'print', 'floral', 'paisley', 'abstract', 'geometric',
  'animal', 'leopard', 'zebra', 'snake', 'polka', 'dot', 'striped',
  'stripe', 'plaid', 'check', 'gingham', 'tartan', 'houndstooth',
  'tie-dye', 'marble', 'tropical', 'botanical', 'damask', 'toile',
  'ikat', 'aztec', 'tribal', 'ethnic', 'batik', 'chinoiserie',
  
  // Surface treatments
  'embroidered', 'embroidery', 'sequin', 'beaded', 'crystal',
  'applique', 'patchwork', 'quilted', 'textured', 'ribbed',
  
  // Transparency/texture
  'lace', 'mesh', 'sheer', 'see-through', 'crochet', 'knit',
  
  // Color effects
  'gradient', 'ombre', 'color-block', 'two-tone', 'contrast',
  'colorful', 'vibrant', 'bold'
];

// NEW: Trim vocabulary for border/edge details
const TRIM_WORDS = [
  'border', 'trim', 'edging', 'piping', 'contrast trim',
  'fringe', 'tassel', 'ruffle', 'pleated', 'scalloped',
  'lace trim', 'embroidered border', 'gold trim', 'silver trim',
  'beaded edge', 'sequin border'
];

// NEW: Brand vocabulary (100+ fashion brands) for soft detection
const BRAND_PATTERNS = [
  // Luxury
  'zimmermann', 'etro', 'gucci', 'prada', 'versace', 'dolce gabbana',
  'valentino', 'fendi', 'burberry', 'chloe', 'loewe', 'dior', 'chanel',
  'louis vuitton', 'balenciaga', 'givenchy', 'bottega veneta', 'hermes',
  
  // Contemporary luxury
  'net-a-porter', 'matchesfashion', 'ssense', 'mytheresa',
  'rixo', 'ganni', 'staud', 'self-portrait', 'zimmerman', 'johanna ortiz',
  
  // Premium
  'reiss', 'karen millen', 'hobbs', 'ted baker', 'massimo dutti',
  'cos', 'arket', 'other stories', 'jcrew', 'j.crew', 'banana republic',
  
  // Fast fashion
  'zara', 'mango', 'hm', 'h&m', 'uniqlo', 'asos', 'topshop', 'river island',
  'pull bear', 'bershka', 'stradivarius', 'reserved', 'primark', 'boohoo',
  'pretty little thing', 'plt', 'missguided', 'nasty gal', 'fashion nova',
  
  // Sports/Athletic
  'nike', 'adidas', 'puma', 'reebok', 'new balance', 'under armour',
  'lululemon', 'alo yoga', 'athleta', 'fabletics', 'sweaty betty',
  
  // Middle East focused
  'namshi', 'ounass', 'farfetch', 'modanisa', 'shukr', 'inayah',
  'aab', 'haute hijab', 'bokitta', 'noon', 'sivvi',
  
  // US/UK retailers
  'nordstrom', 'revolve', 'anthropologie', 'free people', 'urban outfitters',
  'bloomingdales', 'saks', 'neiman marcus', 'selfridges', 'harrods',
  
  // Value/Discount
  'shein', 'romwe', 'amazon', 'target', 'walmart', 'tjmaxx', 'marshalls'
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

// Extract descriptive terms from visual match titles (enhanced with patterns/trims)
function extractDescriptors(titles: string[]): {
  colors: string[];
  categories: string[];
  silhouettes: string[];
  fabrics: string[];
  patterns: string[];
  trims: string[];
} {
  const allText = titles.join(' ').toLowerCase();
  
  const colors = COLOR_WORDS.filter(c => allText.includes(c));
  const categories = CATEGORY_WORDS.filter(c => allText.includes(c));
  const silhouettes = SILHOUETTE_WORDS.filter(s => allText.includes(s.toLowerCase()));
  const fabrics = FABRIC_WORDS.filter(f => allText.includes(f));
  const patterns = PATTERN_WORDS.filter(p => allText.includes(p));
  const trims = TRIM_WORDS.filter(t => allText.includes(t.toLowerCase()));
  
  return { colors, categories, silhouettes, fabrics, patterns, trims };
}

// NEW: Extract brand hints from visual match titles with confidence scoring
function extractBrandHints(titles: string[]): { brand: string; confidence: number }[] {
  const allText = titles.join(' ').toLowerCase();
  const matches: Map<string, number> = new Map();
  
  for (const brand of BRAND_PATTERNS) {
    // Count occurrences across all titles
    let count = 0;
    for (const title of titles) {
      if (title.toLowerCase().includes(brand)) {
        count++;
      }
    }
    if (count > 0) {
      matches.set(brand, count);
    }
  }
  
  return Array.from(matches.entries())
    .map(([brand, count]) => ({
      brand,
      // Confidence: 0.9 for 3+ mentions, 0.6 for 2, 0.3 for 1
      confidence: count >= 3 ? 0.9 : count >= 2 ? 0.6 : 0.3
    }))
    .sort((a, b) => b.confidence - a.confidence);
}

// Build descriptive query pack with category/color/silhouette/pattern locking
function buildQueryPack(visualMatchTitles: string[]): string[] {
  const queries: string[] = [];
  const { colors, categories, silhouettes, fabrics, patterns, trims } = extractDescriptors(visualMatchTitles);
  
  const primaryColor = colors[0] || '';
  const primaryCategory = categories[0] || '';
  const primarySilhouette = silhouettes[0] || '';
  const primaryFabric = fabrics[0] || '';
  const primaryPattern = patterns[0] || '';
  const primaryTrim = trims[0] || '';
  
  // NEW: Pattern-first queries (highest priority for printed items)
  if (primaryPattern && primaryCategory) {
    queries.push(`${primaryPattern} ${primaryCategory}`);
    if (primaryColor) {
      queries.push(`${primaryColor} ${primaryPattern} ${primaryCategory}`);
    }
  }
  
  // NEW: Trim-based queries
  if (primaryTrim && primaryCategory) {
    queries.push(`${primaryCategory} with ${primaryTrim}`);
  }
  
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
  return uniqueQueries.slice(0, 12); // Increased from 10 to accommodate pattern queries
}

// Build broader "style pack" queries when results are low
function buildStylePackQueries(
  categories: string[],
  colors: string[],
  silhouettes: string[],
  patterns: string[]
): string[] {
  const queries: string[] = [];
  const category = categories[0] || 'modest dress';
  
  // Pattern + category (NEW)
  for (const pattern of patterns.slice(0, 2)) {
    queries.push(`${pattern} ${category}`);
  }
  
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
  
  return [...new Set(queries)].slice(0, 5);
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

    const { imageUrl, imageUrls } = await req.json();

    // Support both single imageUrl and multi-crop imageUrls array
    const primaryImageUrl = imageUrl || (imageUrls?.[0]?.url);
    
    if (!primaryImageUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'imageUrl or imageUrls is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check cache
    const cacheKey = hashKey(primaryImageUrl);
    const cached = await getCache(supabase, cacheKey);
    if (cached) {
      console.log(`[deals-from-image] Cache hit`);
      return new Response(
        JSON.stringify({ ...cached, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[deals-from-image] Processing image for user ${user.id}: ${primaryImageUrl.substring(0, 100)}...`);

    // Initialize pipeline logging
    const pipelineLog: PipelineLog = {
      input_has_image: true,
      query_pack_count: 0,
      raw_results_count: 0,
      after_dedupe_count: 0,
      final_returned_count: 0,
      used_fallback_queries: false,
      brands_detected: [],
      patterns_detected: [],
      lens_calls_count: 0,
      visual_rerank_applied: false,
    };

    // Step 1: Call Google Lens (support multi-crop)
    const imagesToSearch = imageUrls?.length 
      ? imageUrls.slice(0, 2) // Max 2 crops
      : [{ url: primaryImageUrl, cropType: 'full' }];
    
    let allLensVisualMatches: any[] = [];
    
    for (const imgData of imagesToSearch) {
      const lensParams = new URLSearchParams({
        engine: 'google_lens',
        url: imgData.url,
        api_key: SERPAPI_KEY,
        gl: 'ae',
        hl: 'en',
      });

      console.log(`[deals-from-image] Calling Google Lens API (${imgData.cropType || 'primary'})...`);
      const lensResponse = await fetch(`https://serpapi.com/search?${lensParams.toString()}`);
      const lensData = await lensResponse.json();
      pipelineLog.lens_calls_count = (pipelineLog.lens_calls_count || 0) + 1;

      if (!lensData.error) {
        const matches = lensData.visual_matches || [];
        // Weight garment/pattern crops higher
        const weight = imgData.cropType === 'pattern' ? 1.5 : imgData.cropType === 'garment' ? 1.2 : 1.0;
        for (const match of matches) {
          allLensVisualMatches.push({ ...match, _weight: weight, _cropType: imgData.cropType });
        }
        
        // Also grab knowledge graph if available
        if (lensData.knowledge_graph?.title) {
          allLensVisualMatches.unshift({ 
            title: lensData.knowledge_graph.title,
            _weight: 2.0,
            _cropType: 'knowledge_graph'
          });
        }
      } else {
        console.warn(`[deals-from-image] Lens API error for ${imgData.cropType}:`, lensData.error);
      }
    }

    // Process merged visual matches
    const visualMatches: LensVisualMatch[] = allLensVisualMatches
      .filter((match: any) => {
        const source = (match.source || '').toLowerCase();
        return !source.includes('pinterest') && !source.includes('instagram');
      })
      .slice(0, 15) // Increased limit for multi-crop
      .map((match: any) => ({
        title: match.title || '',
        link: normalizeLink(match.link),
        thumbnail: match.thumbnail || '',
        source: match.source || '',
      }));

    console.log(`[deals-from-image] Found ${visualMatches.length} visual matches from ${pipelineLog.lens_calls_count} Lens calls`);

    // Extract titles for query pack building
    const visualMatchTitles = visualMatches.map(m => m.title).filter(Boolean);

    // NEW: Extract brand hints from visual matches
    const detectedBrands = extractBrandHints(visualMatchTitles);
    pipelineLog.brands_detected = detectedBrands.slice(0, 3).map(b => b.brand);
    
    // NEW: Extract pattern descriptors
    const { patterns: detectedPatterns } = extractDescriptors(visualMatchTitles);
    pipelineLog.patterns_detected = detectedPatterns.slice(0, 5);
    
    console.log(`[deals-from-image] Detected brands: ${pipelineLog.brands_detected?.join(', ') || 'none'}`);
    console.log(`[deals-from-image] Detected patterns: ${pipelineLog.patterns_detected?.join(', ') || 'none'}`);

    // Step 2: Build descriptive query pack with category/color/silhouette/pattern locking
    const searchQueries = buildQueryPack(visualMatchTitles);
    
    // NEW: Add brand-specific query if high confidence brand detected
    if (detectedBrands.length > 0 && detectedBrands[0].confidence >= 0.6) {
      const brandQuery = `${detectedBrands[0].brand} ${extractDescriptors(visualMatchTitles).categories[0] || 'fashion'}`;
      if (!searchQueries.includes(brandQuery)) {
        searchQueries.unshift(brandQuery); // Prioritize brand query
      }
    }
    
    pipelineLog.query_pack_count = searchQueries.length;
    
    console.log(`[deals-from-image] Query pack (${searchQueries.length}): ${searchQueries.slice(0, 3).join(' | ')}...`);

    const allShoppingResults: ShoppingResult[] = [];
    const seenKeys = new Set<string>();

    // Step 3: Run shopping searches
    for (const query of searchQueries.slice(0, 8)) {
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
            // Prefer larger image over thumbnail for better visual reranking
            thumbnail: result.image || result.thumbnail || '',
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
      
      const { colors, categories, silhouettes, patterns } = extractDescriptors(visualMatchTitles);
      const stylePackQueries = buildStylePackQueries(categories, colors, silhouettes, patterns);
      
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
              // Prefer larger image over thumbnail for better visual reranking
              thumbnail: result.image || result.thumbnail || '',
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

    // Step 6: Enhanced visual heuristic re-ranking with patterns and brands
    const { 
      colors: inputColors, 
      categories: inputCategories, 
      patterns: inputPatterns,
      trims: inputTrims 
    } = extractDescriptors(visualMatchTitles);
    
    if (inputColors.length > 0 || inputCategories.length > 0 || inputPatterns.length > 0) {
      // Compute similarity scores with NEW weighting scheme
      for (const result of allShoppingResults) {
        let score = 0;
        const resultTitle = (result.title || '').toLowerCase();
        const resultSource = (result.source || '').toLowerCase();
        
        // NEW: Pattern matching (0.25 weight - highest priority for prints)
        for (const pattern of inputPatterns) {
          if (resultTitle.includes(pattern)) {
            score += 0.25;
            break;
          }
        }
        
        // Category matching (0.20 weight - reduced from 0.4)
        for (const category of inputCategories) {
          if (resultTitle.includes(category)) {
            score += 0.20;
            break;
          }
        }
        
        // Color matching (0.15 weight - reduced from 0.4)
        for (const color of inputColors) {
          if (resultTitle.includes(color)) {
            score += 0.15;
            break;
          }
        }
        
        // NEW: Trim matching (0.10 weight)
        for (const trim of inputTrims) {
          if (resultTitle.includes(trim.toLowerCase())) {
            score += 0.10;
            break;
          }
        }
        
        // NEW: Brand matching (0.05-0.12 soft bonus)
        if (detectedBrands.length > 0) {
          const topBrand = detectedBrands[0];
          if (resultTitle.includes(topBrand.brand) || resultSource.includes(topBrand.brand)) {
            // Soft bonus: max 0.12 for high-confidence brand
            score += topBrand.confidence * 0.12;
          }
        }
        
        // Source quality bonus (0.05 weight - reduced from 0.2)
        const premiumSources = ['namshi', 'ounass', 'farfetch', 'asos', 'zara', 'nike'];
        const goodSources = ['noon', 'amazon', 'shein'];
        
        for (const src of premiumSources) {
          if (resultSource.includes(src)) {
            score += 0.05;
            break;
          }
        }
        if (score < 0.05) {
          for (const src of goodSources) {
            if (resultSource.includes(src)) {
              score += 0.03;
              break;
            }
          }
        }
        
        result.similarity_score = Math.min(score, 1);
      }
      
      // Sort by similarity score first, then by price
      allShoppingResults.sort((a, b) => {
        const scoreA = a.similarity_score ?? 0;
        const scoreB = b.similarity_score ?? 0;
        
        if (Math.abs(scoreA - scoreB) > 0.08) {
          return scoreB - scoreA; // Higher similarity first
        }
        
        // Same similarity tier - sort by price
        if (a.extracted_price === null) return 1;
        if (b.extracted_price === null) return -1;
        return a.extracted_price - b.extracted_price;
      });
      
      console.log(`[deals-from-image] Applied enhanced rerank: patterns=[${inputPatterns.slice(0, 2).join(',')}], colors=[${inputColors.slice(0, 2).join(',')}], categories=[${inputCategories.slice(0, 2).join(',')}]`);
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

    // Step 7: Visual rerank using thumbnail embeddings (via Gemini) with pattern mode
    const isPatternMode = inputPatterns.length > 0;
    
    if (allShoppingResults.length >= 10) {
      console.log(`[deals-from-image] Running visual rerank on top 25 results, patternMode=${isPatternMode}...`);
      
      try {
        const topResults = allShoppingResults.slice(0, 25);
        const validThumbnails = topResults.filter(r => 
          r.thumbnail && r.thumbnail.startsWith('http')
        );
        
        if (validThumbnails.length >= 5) {
          const rerankResponse = await fetch(`${supabaseUrl}/functions/v1/visual-rerank`, {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              queryImageUrl: primaryImageUrl,
              isPatternMode,
              results: validThumbnails.map(r => ({
                id: r.link,
                thumbnailUrl: r.thumbnail,
                currentScore: r.similarity_score ?? 0,
              })),
            }),
          });
          
          if (rerankResponse.ok) {
            const rerankData = await rerankResponse.json();
            if (rerankData.success && rerankData.results) {
              let filteredCount = 0;
              
              for (const vr of rerankData.results) {
                const result = allShoppingResults.find(r => r.link === vr.id);
                if (result) {
                  result.similarity_score = vr.combinedScore;
                  
                  // Track filtered items (they have combinedScore = 0)
                  if (vr.filtered) {
                    filteredCount++;
                  }
                }
              }
              
              // Re-sort by combined score (filtered items sink to bottom with score 0)
              allShoppingResults.sort((a, b) => 
                (b.similarity_score ?? 0) - (a.similarity_score ?? 0)
              );
              
              // Update positions again
              allShoppingResults.forEach((result, index) => {
                result.position = index + 1;
              });
              
              pipelineLog.visual_rerank_applied = true;
              pipelineLog.pattern_mode = isPatternMode;
              pipelineLog.visual_filtered_count = filteredCount;
              console.log(`[deals-from-image] Visual rerank applied: ${filteredCount} filtered, mode=${isPatternMode ? 'pattern' : 'normal'}`);
            }
          } else {
            console.warn('[deals-from-image] Visual rerank returned non-OK status:', rerankResponse.status);
          }
        }
      } catch (err) {
        console.warn('[deals-from-image] Visual rerank failed:', err);
      }
    }

    // Add top 5 results to pipeline log
    pipelineLog.top_5_results = allShoppingResults.slice(0, 5).map(r => ({
      title: r.title.substring(0, 50),
      thumb: r.thumbnail?.substring(0, 50) || '',
      final_score: r.similarity_score ?? 0,
    }));

    const response: DealsResponse = {
      success: true,
      input_image: primaryImageUrl,
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

  } catch (error: any) {
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
