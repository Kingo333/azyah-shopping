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
const MAX_CHIP_LOOPS = 2;

// ============ Interfaces ============

interface UnifiedInput {
  source: 'app_upload' | 'chrome_extension' | 'safari_extension';
  market: 'AE' | 'US' | 'UK';
  page_url?: string;
  title_hint?: string;
  price_hint?: number;
  currency_hint?: string;
  image_url?: string;
  image_base64?: string;
}

interface XimilarTags {
  primary_category: string | null;
  subcategory: string | null;
  colors: Array<{ name: string; probability: number }>;
  pattern_tags: string[];
  material_tags: string[];
  style_tags: string[];
  roi_box: { x: number; y: number; width: number; height: number } | null;
  is_pattern_mode: boolean;
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
  sub_scores?: {
    pattern: number;
    silhouette: number;
    color: number;
  };
  tag_agreement?: number;
  is_exact_match?: boolean;
}

interface DebugInfo {
  image_normalize: {
    downloaded: boolean;
    uploaded_path: string | null;
    signed: boolean;
    content_type: string | null;
    bytes: number | null;
  };
  ximilar: {
    called: boolean;
    latency_ms: number;
    objects_detected: number;
    tags_summary: string;
    roi_box_present: boolean;
    is_pattern_mode: boolean;
    failed?: boolean;
    fallback_used?: boolean;
  };
  serpapi: {
    lens_ran: boolean;
    exact_count: number;
    visual_count: number;
    chips_used: number;
    shopping_queries: string[];
    shopping_result_count: number;
    market: string;
  };
  rerank: {
    sent_count: number;
    scored_count: number;
    filtered_count: number;
    min_thresholds_used: { visual: number; pattern: number };
  };
  filters: {
    before_filter: number;
    dropped_by_category_gate: number;
    dropped_by_color_gate: number;
    dropped_by_visual_threshold: number;
    after_filter: number;
  };
  top5_scores: Array<{ url: string; visual: number; tag_agree: number; final: number }>;
  timing_ms: {
    image_normalize: number;
    ximilar: number;
    lens: number;
    chips: number;
    shopping: number;
    rerank: number;
    total: number;
  };
}

// ============ Vocabularies (from existing functions) ============

const COLOR_WORDS = [
  'grey', 'gray', 'stone', 'beige', 'black', 'white', 'navy', 'blue', 
  'cream', 'camel', 'brown', 'green', 'pink', 'red', 'burgundy', 'maroon',
  'olive', 'khaki', 'nude', 'blush', 'coral', 'teal', 'emerald', 'gold',
  'silver', 'charcoal', 'sand', 'ivory', 'taupe', 'sage', 'rust', 'mustard',
  'multicolor', 'multi-color', 'multicolored', 'multi', 'purple', 'yellow'
];

const CATEGORY_WORDS = [
  'abaya', 'kaftan', 'caftan', 'dress', 'outer', 'jacket', 'kimono',
  'jalabiya', 'jilbab', 'thobe', 'bisht', 'cardigan', 'coat', 'blazer',
  'modest', 'maxi', 'midi', 'gown', 'cape', 'poncho', 'tunic',
  'robe', 'wrap', 'duster', 'overcoat', 'trench', 'top', 'blouse',
  'skirt', 'pants', 'shorts', 'jeans', 'sweater', 'hoodie'
];

const PATTERN_WORDS = [
  'printed', 'print', 'floral', 'paisley', 'abstract', 'geometric',
  'animal', 'leopard', 'zebra', 'snake', 'polka', 'dot', 'striped',
  'stripe', 'plaid', 'check', 'gingham', 'tartan', 'houndstooth',
  'tie-dye', 'marble', 'tropical', 'botanical', 'damask', 'toile',
  'ikat', 'aztec', 'tribal', 'ethnic', 'batik', 'chinoiserie',
  'embroidered', 'embroidery', 'sequin', 'beaded', 'crystal',
  'applique', 'patchwork', 'quilted', 'textured', 'ribbed',
  'lace', 'mesh', 'sheer', 'crochet', 'gradient', 'ombre',
  'color-block', 'two-tone', 'contrast'
];

const FABRIC_WORDS = [
  'satin', 'chiffon', 'linen', 'cotton', 'silk', 'crepe', 'georgette',
  'velvet', 'jersey', 'knit', 'denim', 'lace', 'sequin', 'leather'
];

// Similar colors (for soft color gate)
const SIMILAR_COLORS: Record<string, string[]> = {
  'black': ['charcoal'],
  'navy': ['blue'],
  'cream': ['ivory', 'beige', 'white'],
  'beige': ['cream', 'sand', 'ivory', 'taupe'],
  'grey': ['gray', 'charcoal', 'silver'],
  'gray': ['grey', 'charcoal', 'silver'],
};

// ============ Helper Functions ============

function hashKey(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `unified_${Math.abs(hash).toString(36)}`;
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

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

// Fallback descriptor extraction (when Ximilar fails)
function extractDescriptors(titles: string[]): {
  colors: string[];
  categories: string[];
  patterns: string[];
  fabrics: string[];
} {
  const allText = titles.join(' ').toLowerCase();
  
  const colors = COLOR_WORDS.filter(c => allText.includes(c));
  const categories = CATEGORY_WORDS.filter(c => allText.includes(c));
  const patterns = PATTERN_WORDS.filter(p => allText.includes(p));
  const fabrics = FABRIC_WORDS.filter(f => allText.includes(f));
  
  return { colors, categories, patterns, fabrics };
}

// Market mapping for SerpApi
function getMarketParams(market: string): { gl: string; location: string } {
  switch (market) {
    case 'UK':
      return { gl: 'uk', location: 'United Kingdom' };
    case 'US':
      return { gl: 'us', location: 'United States' };
    case 'AE':
    default:
      return { gl: 'ae', location: 'United Arab Emirates' };
  }
}

// Check if colors are similar enough (soft gate)
function areColorsSimilar(color1: string, color2: string): boolean {
  const c1 = color1.toLowerCase();
  const c2 = color2.toLowerCase();
  
  if (c1 === c2) return true;
  
  const similar1 = SIMILAR_COLORS[c1] || [];
  const similar2 = SIMILAR_COLORS[c2] || [];
  
  return similar1.includes(c2) || similar2.includes(c1);
}

// Build hint string from Ximilar tags
function buildHintFromXimilar(tags: XimilarTags): string {
  const parts: string[] = [];
  
  // Pattern first (most distinctive)
  if (tags.pattern_tags.length > 0) {
    parts.push(tags.pattern_tags[0]);
  }
  
  // Subcategory or category
  if (tags.subcategory) {
    parts.push(tags.subcategory);
  } else if (tags.primary_category) {
    parts.push(tags.primary_category);
  }
  
  // Top 1-2 colors
  for (const color of tags.colors.slice(0, 2)) {
    parts.push(color.name);
  }
  
  // Optional material (keep short)
  if (tags.material_tags.length > 0 && parts.length < 5) {
    parts.push(tags.material_tags[0]);
  }
  
  return parts.join(' ');
}

// Fallback hint builder from descriptors
function buildHintFromDescriptors(
  colors: string[],
  categories: string[],
  patterns: string[]
): string {
  const parts: string[] = [];
  
  if (patterns.length > 0) parts.push(patterns[0]);
  if (categories.length > 0) parts.push(categories[0]);
  if (colors.length > 0) parts.push(colors[0]);
  if (colors.length > 1) parts.push(colors[1]);
  
  return parts.join(' ');
}

// ============ Rate Limiting & Caching ============

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

// ============ Ximilar Integration ============

async function callXimilar(imageUrl: string, apiKey: string): Promise<XimilarTags | null> {
  try {
    // Try detect_tags_all first (multi-item detection)
    const response = await fetch('https://api.ximilar.com/tagging/fashion/v2/detect_tags_all', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        records: [{ _url: imageUrl }],
      }),
    });

    if (!response.ok) {
      console.warn(`[deals-unified] Ximilar API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const record = data.records?.[0];
    
    if (!record?._objects?.length) {
      // Fallback to detect_tags (single item)
      console.log('[deals-unified] Ximilar detect_tags_all returned no objects, trying detect_tags...');
      
      const fallbackResponse = await fetch('https://api.ximilar.com/tagging/fashion/v2/detect_tags', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: [{ _url: imageUrl }],
        }),
      });
      
      if (!fallbackResponse.ok) return null;
      
      const fallbackData = await fallbackResponse.json();
      return parseXimilarResponse(fallbackData.records?.[0]);
    }

    return parseXimilarResponse(record, true);
  } catch (err) {
    console.error('[deals-unified] Ximilar error:', err);
    return null;
  }
}

function parseXimilarResponse(record: any, isAllMode = false): XimilarTags | null {
  if (!record) return null;
  
  try {
    // For detect_tags_all, get the largest/first object
    const object = isAllMode ? record._objects?.[0] : record;
    const tags = object?._tags || record?._tags || {};
    
    // Extract category
    const categoryTag = tags['Category']?.[0] || tags['Top Category']?.[0];
    const subcategoryTag = tags['Subcategory']?.[0] || tags['Best Category']?.[0];
    
    // Extract colors (dominant color)
    const colorTags = tags['Dominant Color'] || tags['Color'] || [];
    const colors = colorTags
      .filter((c: any) => c.prob >= 0.1)
      .slice(0, 3)
      .map((c: any) => ({
        name: c.name?.toLowerCase() || '',
        probability: c.prob || 0,
      }));
    
    // Extract patterns
    const patternTags = tags['Pattern'] || tags['Design'] || tags['Print'] || [];
    const patterns = patternTags
      .filter((p: any) => p.prob >= 0.3)
      .map((p: any) => p.name?.toLowerCase() || '')
      .filter(Boolean);
    
    // Extract materials
    const materialTags = tags['Material'] || tags['Fabric'] || [];
    const materials = materialTags
      .filter((m: any) => m.prob >= 0.3)
      .map((m: any) => m.name?.toLowerCase() || '')
      .filter(Boolean);
    
    // Extract style
    const styleTags = tags['Style'] || tags['Occasion'] || [];
    const styles = styleTags
      .filter((s: any) => s.prob >= 0.3)
      .map((s: any) => s.name?.toLowerCase() || '')
      .filter(Boolean);
    
    // Extract ROI bounding box
    const bbox = object?._bounding_box || null;
    const roi_box = bbox ? {
      x: bbox.x || 0,
      y: bbox.y || 0,
      width: bbox.width || 1,
      height: bbox.height || 1,
    } : null;
    
    // Determine pattern mode
    const is_pattern_mode = patterns.length > 0 || 
      (tags['Design']?.some((d: any) => d.name?.toLowerCase() !== 'solid' && d.prob >= 0.5));
    
    return {
      primary_category: categoryTag?.name?.toLowerCase() || null,
      subcategory: subcategoryTag?.name?.toLowerCase() || null,
      colors,
      pattern_tags: patterns,
      material_tags: materials,
      style_tags: styles,
      roi_box,
      is_pattern_mode,
    };
  } catch (err) {
    console.error('[deals-unified] Ximilar parse error:', err);
    return null;
  }
}

// ============ Main Handler ============

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Get API keys
    const SERPAPI_KEY = Deno.env.get('SERPAPI_API_KEY');
    const XIMILAR_KEY = Deno.env.get('XIMILAR_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!SERPAPI_KEY) {
      throw new Error('SERPAPI_API_KEY not configured');
    }

    // Auth check
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

    // Rate limit
    const allowed = await checkRateLimit(supabase, user.id);
    if (!allowed) {
      return new Response(
        JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again in a minute.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse input
    const input: UnifiedInput = await req.json();
    const market = input.market || 'AE';
    const marketParams = getMarketParams(market);

    console.log(`[deals-unified] Starting search for user ${user.id}, source=${input.source}, market=${market}`);

    // Initialize debug info
    const debug: DebugInfo = {
      image_normalize: { downloaded: false, uploaded_path: null, signed: false, content_type: null, bytes: null },
      ximilar: { called: false, latency_ms: 0, objects_detected: 0, tags_summary: '', roi_box_present: false, is_pattern_mode: false },
      serpapi: { lens_ran: false, exact_count: 0, visual_count: 0, chips_used: 0, shopping_queries: [], shopping_result_count: 0, market },
      rerank: { sent_count: 0, scored_count: 0, filtered_count: 0, min_thresholds_used: { visual: 0.40, pattern: 0.50 } },
      filters: { before_filter: 0, dropped_by_category_gate: 0, dropped_by_color_gate: 0, dropped_by_visual_threshold: 0, after_filter: 0 },
      top5_scores: [],
      timing_ms: { image_normalize: 0, ximilar: 0, lens: 0, chips: 0, shopping: 0, rerank: 0, total: 0 },
    };

    // ============ STAGE 1: Image Normalization ============
    const normalizeStart = Date.now();
    let signedImageUrl: string | null = null;

    if (input.image_base64) {
      // Upload base64 to storage
      console.log('[deals-unified] Uploading base64 image...');
      const base64Data = input.image_base64.replace(/^data:image\/\w+;base64,/, '');
      const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const imagePath = `unified/${user.id}/${crypto.randomUUID()}.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from('deals-uploads')
        .upload(imagePath, imageBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });
      
      if (!uploadError) {
        const { data: signedUrlData } = await supabase.storage
          .from('deals-uploads')
          .createSignedUrl(imagePath, 900);
        
        if (signedUrlData?.signedUrl) {
          signedImageUrl = signedUrlData.signedUrl;
          debug.image_normalize = {
            downloaded: false,
            uploaded_path: imagePath,
            signed: true,
            content_type: 'image/jpeg',
            bytes: imageBuffer.length,
          };
        }
      }
    } else if (input.image_url) {
      // Check if already signed URL (from our storage)
      const isOurStorage = input.image_url.includes('supabase.co') || input.image_url.includes('lovable.app');
      
      if (isOurStorage) {
        signedImageUrl = input.image_url;
        debug.image_normalize.signed = true;
      } else {
        // Download external image
        console.log('[deals-unified] Downloading external image...');
        try {
          const imageResponse = await fetch(input.image_url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; AzyahBot/1.0; +https://azyah.com)',
              'Accept': 'image/*',
            }
          });
          
          if (imageResponse.ok) {
            const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
            const imageBlob = await imageResponse.blob();
            
            if (contentType.startsWith('image/') && imageBlob.size < 8 * 1024 * 1024) {
              const imageBuffer = await imageBlob.arrayBuffer();
              const ext = contentType.includes('png') ? 'png' : 'jpg';
              const imagePath = `unified/${user.id}/${crypto.randomUUID()}.${ext}`;
              
              const { error: uploadError } = await supabase.storage
                .from('deals-uploads')
                .upload(imagePath, imageBuffer, { contentType, upsert: false });
              
              if (!uploadError) {
                const { data: signedUrlData } = await supabase.storage
                  .from('deals-uploads')
                  .createSignedUrl(imagePath, 900);
                
                if (signedUrlData?.signedUrl) {
                  signedImageUrl = signedUrlData.signedUrl;
                  debug.image_normalize = {
                    downloaded: true,
                    uploaded_path: imagePath,
                    signed: true,
                    content_type: contentType,
                    bytes: imageBlob.size,
                  };
                }
              }
            }
          }
        } catch (err) {
          console.warn('[deals-unified] Image download failed:', err);
          // Fall back to original URL
          signedImageUrl = input.image_url;
        }
      }
    }

    debug.timing_ms.image_normalize = Date.now() - normalizeStart;

    if (!signedImageUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'No valid image provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check cache
    const cacheKey = hashKey(signedImageUrl + market);
    const cached = await getCache(supabase, cacheKey);
    if (cached) {
      console.log('[deals-unified] Cache hit');
      return new Response(
        JSON.stringify({ ...cached, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ STAGE 2: Ximilar Tagging ============
    const ximilarStart = Date.now();
    let ximilarTags: XimilarTags | null = null;
    let useXimilar = true;

    if (XIMILAR_KEY) {
      console.log('[deals-unified] Calling Ximilar...');
      debug.ximilar.called = true;
      
      ximilarTags = await callXimilar(signedImageUrl, XIMILAR_KEY);
      
      if (ximilarTags) {
        debug.ximilar.objects_detected = 1;
        debug.ximilar.is_pattern_mode = ximilarTags.is_pattern_mode;
        debug.ximilar.roi_box_present = !!ximilarTags.roi_box;
        debug.ximilar.tags_summary = `${ximilarTags.primary_category || 'unknown'}, colors: [${ximilarTags.colors.map(c => c.name).join(',')}], patterns: [${ximilarTags.pattern_tags.join(',')}]`;
        console.log(`[deals-unified] Ximilar: ${debug.ximilar.tags_summary}`);
      } else {
        debug.ximilar.failed = true;
        useXimilar = false;
      }
    } else {
      console.log('[deals-unified] Ximilar key not configured, using fallback');
      useXimilar = false;
    }

    debug.timing_ms.ximilar = Date.now() - ximilarStart;

    // ============ STAGE 3: SerpApi Discovery ============
    const lensStart = Date.now();
    
    let exactMatch: any = null;
    const visualMatches: any[] = [];
    const visualMatchTitles: string[] = [];
    const chipsToLoop: string[] = [];

    // 3a. Run Google Lens
    console.log('[deals-unified] Running Google Lens...');
    const lensParams = new URLSearchParams({
      engine: 'google_lens',
      url: signedImageUrl,
      api_key: SERPAPI_KEY,
      gl: marketParams.gl,
      hl: 'en',
    });

    try {
      const lensResponse = await fetch(`https://serpapi.com/search?${lensParams.toString()}`);
      const lensData = await lensResponse.json();
      debug.serpapi.lens_ran = true;

      // Check for exact matches (original source)
      if (lensData.exact_matches?.length > 0) {
        const exact = lensData.exact_matches[0];
        exactMatch = {
          found: true,
          link: normalizeLink(exact.link),
          title: exact.title || '',
          thumbnail: exact.thumbnail || '',
          source: exact.source || '',
          confidence: 0.95,
        };
        debug.serpapi.exact_count = lensData.exact_matches.length;
        console.log(`[deals-unified] Found exact match: ${exactMatch.source}`);
      }

      // Visual matches
      const matches = (lensData.visual_matches || [])
        .filter((match: any) => {
          const source = (match.source || '').toLowerCase();
          return !source.includes('pinterest') && !source.includes('instagram');
        })
        .slice(0, 15);

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
      debug.serpapi.visual_count = visualMatches.length;

      // Collect chips for looping (max 2)
      if (lensData.chips?.length > 0) {
        for (const chip of lensData.chips.slice(0, MAX_CHIP_LOOPS)) {
          if (chip.link) {
            chipsToLoop.push(chip.link);
          }
        }
      }

    } catch (err) {
      console.error('[deals-unified] Lens error:', err);
    }

    debug.timing_ms.lens = Date.now() - lensStart;

    // 3b. Chip looping (max 2 chips)
    const chipStart = Date.now();
    if (chipsToLoop.length > 0) {
      console.log(`[deals-unified] Looping ${chipsToLoop.length} chips...`);
      
      for (const chipUrl of chipsToLoop) {
        try {
          const chipResponse = await fetch(chipUrl + `&api_key=${SERPAPI_KEY}`);
          const chipData = await chipResponse.json();
          debug.serpapi.chips_used++;

          const chipMatches = (chipData.visual_matches || [])
            .filter((match: any) => {
              const source = (match.source || '').toLowerCase();
              return !source.includes('pinterest') && !source.includes('instagram');
            })
            .slice(0, 5);

          for (const match of chipMatches) {
            const key = normalizeLink(match.link);
            if (!visualMatches.some(v => v.link === key)) {
              visualMatches.push({
                title: match.title || '',
                link: key,
                thumbnail: match.thumbnail || '',
                source: match.source || '',
              });
              if (match.title) {
                visualMatchTitles.push(match.title);
              }
            }
          }
        } catch (err) {
          console.warn('[deals-unified] Chip loop error:', err);
        }
      }
    }
    debug.timing_ms.chips = Date.now() - chipStart;

    // ============ Build search queries ============
    let hintString = '';
    let fallbackDescriptors = { colors: [] as string[], categories: [] as string[], patterns: [] as string[], fabrics: [] as string[] };
    
    if (useXimilar && ximilarTags) {
      hintString = buildHintFromXimilar(ximilarTags);
    } else {
      // Fallback to descriptor extraction
      fallbackDescriptors = extractDescriptors([...visualMatchTitles, input.title_hint || '']);
      hintString = buildHintFromDescriptors(
        fallbackDescriptors.colors,
        fallbackDescriptors.categories,
        fallbackDescriptors.patterns
      );
      debug.ximilar.fallback_used = true;
    }

    console.log(`[deals-unified] Query hint: "${hintString}"`);

    // Build query pack
    const searchQueries: string[] = [];
    
    // Primary hint query
    if (hintString) {
      searchQueries.push(hintString);
    }
    
    // Title hint query
    if (input.title_hint) {
      const cleanTitle = input.title_hint
        .replace(/\s*[-|]\s*[^-|]+$/, '')
        .replace(/\b(free shipping|sale|discount|off)\b/gi, '')
        .trim();
      if (cleanTitle.length > 5) {
        searchQueries.push(cleanTitle);
      }
    }

    // Visual match title queries
    for (const title of visualMatchTitles.slice(0, 3)) {
      const cleanTitle = title
        .replace(/\s*[-|]\s*[^-|]+$/, '')
        .replace(/\b(free shipping|sale|discount|off)\b/gi, '')
        .trim();
      if (cleanTitle.length > 5 && !searchQueries.includes(cleanTitle)) {
        searchQueries.push(cleanTitle);
      }
    }

    // Dedupe queries
    const uniqueQueries = [...new Set(searchQueries)].slice(0, 6);
    debug.serpapi.shopping_queries = uniqueQueries;

    // ============ 3c. Shopping searches ============
    const shoppingStart = Date.now();
    const allShoppingResults: ShoppingResult[] = [];
    const seenKeys = new Set<string>();

    for (const query of uniqueQueries) {
      if (!query) continue;

      const shoppingParams = new URLSearchParams({
        engine: 'google_shopping',
        q: query,
        api_key: SERPAPI_KEY,
        gl: marketParams.gl,
        hl: 'en',
        location: marketParams.location,
      });

      try {
        console.log(`[deals-unified] Shopping: "${query.substring(0, 40)}..."`);
        const shoppingResponse = await fetch(`https://serpapi.com/search?${shoppingParams.toString()}`);
        const shoppingData = await shoppingResponse.json();

        const allResults = mergeShoppingArrays(shoppingData);
        debug.serpapi.shopping_result_count += allResults.length;

        for (const result of allResults.slice(0, 15)) {
          const key = dedupKey(result);
          if (!key || seenKeys.has(key)) continue;
          seenKeys.add(key);

          allShoppingResults.push({
            title: result.title || '',
            link: normalizeLink(result.link),
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
        console.warn(`[deals-unified] Shopping error:`, err);
      }
    }

    debug.timing_ms.shopping = Date.now() - shoppingStart;
    debug.filters.before_filter = allShoppingResults.length;

    // ============ STAGE 4: Visual Rerank ============
    const rerankStart = Date.now();
    const isPatternMode = useXimilar ? (ximilarTags?.is_pattern_mode || false) : (fallbackDescriptors.patterns.length > 0);
    
    // Set thresholds based on mode
    const minVisualThreshold = isPatternMode ? 0.50 : 0.40;
    const minPatternThreshold = isPatternMode ? 0.50 : 0;
    debug.rerank.min_thresholds_used = { visual: minVisualThreshold, pattern: minPatternThreshold };

    if (allShoppingResults.length >= 5 && LOVABLE_API_KEY) {
      console.log(`[deals-unified] Running visual rerank on ${Math.min(allShoppingResults.length, 30)} results, patternMode=${isPatternMode}...`);
      
      try {
        const topResults = allShoppingResults.slice(0, 30);
        const validThumbnails = topResults.filter(r => r.thumbnail && r.thumbnail.startsWith('http'));
        debug.rerank.sent_count = validThumbnails.length;

        if (validThumbnails.length >= 5) {
          const rerankResponse = await fetch(`${supabaseUrl}/functions/v1/visual-rerank`, {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              queryImageUrl: signedImageUrl,
              isPatternMode,
              results: validThumbnails.map(r => ({
                id: r.link,
                thumbnailUrl: r.thumbnail,
                currentScore: 0.5,
              })),
            }),
          });

          if (rerankResponse.ok) {
            const rerankData = await rerankResponse.json();
            if (rerankData.success && rerankData.results) {
              debug.rerank.scored_count = rerankData.results.length;
              
              for (const vr of rerankData.results) {
                const result = allShoppingResults.find(r => r.link === vr.id);
                if (result) {
                  result.similarity_score = vr.visualSimilarity;
                  result.sub_scores = vr.subScores;
                  
                  // Track filtered but don't hard-drop (soft gate per user's tweak)
                  if (vr.filtered) {
                    debug.rerank.filtered_count++;
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('[deals-unified] Visual rerank failed:', err);
      }
    }

    debug.timing_ms.rerank = Date.now() - rerankStart;

    // ============ STAGE 5: Filtering + Scoring ============
    const ximilarColors = useXimilar && ximilarTags ? ximilarTags.colors.map(c => c.name) : fallbackDescriptors.colors;
    const ximilarCategory = useXimilar && ximilarTags ? (ximilarTags.subcategory || ximilarTags.primary_category) : fallbackDescriptors.categories[0];
    const ximilarPatterns = useXimilar && ximilarTags ? ximilarTags.pattern_tags : fallbackDescriptors.patterns;

    // Compute tag agreement and apply soft filters
    for (const result of allShoppingResults) {
      const resultTitle = (result.title || '').toLowerCase();
      const visualScore = result.similarity_score ?? 0;
      const colorSubScore = result.sub_scores?.color ?? 0;
      
      let tagAgreement = 0;
      let penalized = false;
      
      // Category match (soft - 0.15-0.25)
      if (ximilarCategory) {
        const categoryMatch = resultTitle.includes(ximilarCategory.toLowerCase());
        if (categoryMatch) {
          tagAgreement += isPatternMode ? 0.15 : 0.25;
        } else if (visualScore < 0.70) {
          // Penalize only if visual is not strong
          debug.filters.dropped_by_category_gate++;
          penalized = true;
        }
      }
      
      // Color match (SOFT gate per user's tweak - use visual color score when available)
      if (ximilarColors.length > 0) {
        const primaryColor = ximilarColors[0];
        const titleHasColor = ximilarColors.some(c => resultTitle.includes(c));
        
        if (titleHasColor) {
          tagAgreement += isPatternMode ? 0.25 : 0.35;
        } else if (colorSubScore >= 0.45) {
          // Trust visual color score even if title doesn't mention it
          tagAgreement += isPatternMode ? 0.15 : 0.25;
        } else if (colorSubScore < 0.35 && !titleHasColor) {
          // Penalize but don't hard-drop
          debug.filters.dropped_by_color_gate++;
          tagAgreement -= 0.10;
          penalized = true;
        }
      }
      
      // Pattern match (0.25-0.35 for pattern mode)
      if (ximilarPatterns.length > 0) {
        const patternMatch = ximilarPatterns.some(p => resultTitle.includes(p));
        if (patternMatch) {
          tagAgreement += isPatternMode ? 0.35 : 0.15;
        }
      }
      
      result.tag_agreement = Math.max(0, Math.min(1, tagAgreement));
      
      // Apply visual threshold filter (HARD for very low scores)
      if (visualScore > 0 && visualScore < minVisualThreshold && !penalized) {
        debug.filters.dropped_by_visual_threshold++;
      }
      
      // Check for exact match (extension mode only)
      if (input.source === 'chrome_extension' && input.page_url) {
        const pageDomain = extractDomain(input.page_url);
        const resultDomain = extractDomain(result.link);
        if (pageDomain && resultDomain && pageDomain === resultDomain && visualScore >= 0.60) {
          result.is_exact_match = true;
        }
      }
    }

    // Final scoring formula
    for (const result of allShoppingResults) {
      const visualScore = result.similarity_score ?? 0.3;
      const tagAgreement = result.tag_agreement ?? 0;
      const exactBonus = result.is_exact_match ? 0.10 : 0;
      
      if (isPatternMode) {
        // Pattern mode: 65% visual, 25% tag agreement, 10% exact
        result.similarity_score = (visualScore * 0.65) + (tagAgreement * 0.25) + exactBonus;
      } else {
        // Normal mode: 60% visual, 30% tag agreement, 10% exact
        result.similarity_score = (visualScore * 0.60) + (tagAgreement * 0.30) + exactBonus;
      }
    }

    // Sort by final score
    allShoppingResults.sort((a, b) => (b.similarity_score ?? 0) - (a.similarity_score ?? 0));
    
    // Update positions
    allShoppingResults.forEach((result, index) => {
      result.position = index + 1;
    });

    debug.filters.after_filter = allShoppingResults.length;

    // ============ Price Stats ============
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

    // ============ Top 5 scores for debug ============
    debug.top5_scores = allShoppingResults.slice(0, 5).map(r => ({
      url: r.link.substring(0, 60),
      visual: r.sub_scores ? (r.sub_scores.pattern + r.sub_scores.silhouette + r.sub_scores.color) / 3 : 0,
      tag_agree: r.tag_agreement ?? 0,
      final: r.similarity_score ?? 0,
    }));

    debug.timing_ms.total = Date.now() - startTime;

    // ============ Store search run (async) ============
    supabase.from('deals_search_runs').insert({
      user_id: user.id,
      source: input.source,
      input_image_url: signedImageUrl,
      page_url: input.page_url || null,
      market,
      ximilar_tags: ximilarTags,
      query_hint: hintString,
      results_count: allShoppingResults.length,
      exact_match_found: !!exactMatch,
      pipeline_timing_ms: debug.timing_ms,
    }).then(() => {}).catch(err => console.warn('[deals-unified] Failed to log search run:', err));

    // ============ Build Response ============
    const response = {
      success: true,
      exact_match: exactMatch,
      shopping_results: allShoppingResults.slice(0, 30),
      visual_matches: visualMatches.slice(0, 10),
      price_stats: priceStats,
      deals_found: allShoppingResults.length,
      ximilar_tags: useXimilar ? {
        primary_category: ximilarTags?.primary_category,
        subcategory: ximilarTags?.subcategory,
        colors: ximilarTags?.colors.map(c => c.name),
        patterns: ximilarTags?.pattern_tags,
        is_pattern_mode: ximilarTags?.is_pattern_mode,
      } : null,
      debug,
    };

    // Cache response
    await setCache(supabase, cacheKey, response);

    console.log(`[deals-unified] Success: ${allShoppingResults.length} deals found in ${debug.timing_ms.total}ms`);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[deals-unified] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        shopping_results: [],
        visual_matches: [],
        price_stats: { low: null, median: null, high: null, valid_count: 0 },
        deals_found: 0,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
