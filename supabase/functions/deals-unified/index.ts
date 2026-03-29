import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_VERSION = 'v4'; // Bump for priority-group ranking (Color → Type → Pattern → Silhouette)
const MIN_RESULTS_FLOOR = 10;
const MAX_CHIP_LOOPS = 2;

// Priority-group ranking thresholds (per audit: Color → Type → Pattern → Silhouette)
const COLOR_PASS_THRESHOLD = 0.55;    // colorSubScore >= this means "color pass" (raised from 0.50)
const TYPE_PASS_THRESHOLD = 0.50;     // type match score threshold
const PATTERN_PASS_THRESHOLD = 0.50;  // pattern score threshold (for patterned items)

// Feature flag for Ximilar (can be disabled via env var)
const USE_XIMILAR = Deno.env.get('USE_XIMILAR') !== 'false';  // Default true

// Item type categories for cheap detection
const ITEM_TYPE_LONG = ['abaya', 'maxi', 'gown', 'dress', 'kaftan', 'jalabiya', 'jilbab', 'coat', 'trench', 'duster', 'robe'];
const ITEM_TYPE_TOP = ['top', 'blouse', 'shirt', 'sweater', 'hoodie', 'cardigan', 'jacket', 'blazer', 'tunic'];
const ITEM_TYPE_BOTTOM = ['pants', 'shorts', 'jeans', 'skirt', 'trousers'];
const ITEM_TYPE_ACCESSORY = ['bag', 'handbag', 'clutch', 'tote', 'purse', 'shoes', 'heels', 'sandals', 'sneakers'];

// Color family mapping for cheap thumbnail filtering
const COLOR_FAMILIES: Record<string, string[]> = {
  'purple_family': ['purple', 'violet', 'lavender', 'mauve', 'plum', 'maroon', 'burgundy', 'lilac', 'amethyst'],
  'brown_family': ['brown', 'tan', 'beige', 'camel', 'taupe', 'rust', 'bronze', 'chocolate', 'coffee', 'mocha'],
  'gold_family': ['gold', 'champagne', 'mustard', 'amber', 'honey', 'brass', 'golden'],
  'blue_family': ['blue', 'navy', 'teal', 'turquoise', 'aqua', 'cobalt', 'indigo', 'azure', 'sapphire', 'denim'],
  'green_family': ['green', 'olive', 'sage', 'emerald', 'mint', 'forest', 'lime', 'khaki', 'moss'],
  'pink_family': ['pink', 'coral', 'blush', 'rose', 'salmon', 'fuchsia', 'magenta', 'peach'],
  'red_family': ['red', 'crimson', 'scarlet', 'ruby', 'cherry', 'wine', 'burgundy', 'maroon'],
  'black_family': ['black', 'charcoal', 'ebony', 'jet', 'onyx'],
  'white_family': ['white', 'cream', 'ivory', 'snow', 'pearl', 'off-white', 'eggshell'],
  'grey_family': ['grey', 'gray', 'silver', 'slate', 'ash', 'pewter', 'stone'],
};

// ============ Interfaces ============

interface ParsedDescriptionHint {
  colors: string[];
  category: string | null;
  pattern: string | null;
  raw: string;
}

interface UnifiedInput {
  source: 'app_upload' | 'chrome_extension' | 'safari_extension';
  market: 'AE' | 'US' | 'UK';
  page_url?: string;
  title_hint?: string;
  price_hint?: number;
  currency_hint?: string;
  image_url?: string;
  image_base64?: string;
  require_ximilar?: boolean; // Strict mode: fail if Ximilar fails
  description_hint?: string;  // NEW: Raw description from ROI detection (e.g., "long purple and brown abaya")
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

interface XimilarDebug {
  called: boolean;
  ok: boolean;
  status: number | null;
  request_id: string | null;
  error_text: string | null;
  latency_ms: number;
  objects_detected: number;
  primary_object_reason: string | null;
  primary_object_area: number | null;
  primary_object_prob: number | null;
  tags_summary: string;
  roi_box_present: boolean;
  is_pattern_mode: boolean;
  failed: boolean;
  fallback_used: boolean;
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
  was_reranked?: boolean;     // Track if this result went through visual rerank
  color_pass?: boolean;       // Track if this result passed color threshold
  type_pass?: boolean;        // NEW: Track if this result passed item type match
  pattern_pass?: boolean;     // NEW: Track if this result passed pattern match
  ranking_group?: 'A' | 'B' | 'C' | 'D';  // NEW: Priority ranking group
  cheap_color_bucket?: 'likely' | 'unknown' | 'unlikely';  // NEW: Cheap color filter result
  cheap_type_bucket?: 'long' | 'top' | 'bottom' | 'accessory' | 'unknown';  // NEW: Cheap type detection
}

interface DebugInfo {
  trace_id: string;
  entry: {
    source: string;
    has_image_url: boolean;
    has_image_base64: boolean;
    has_page_url: boolean;
    has_title_hint: boolean;
    has_description_hint: boolean;  // NEW
    has_ximilar_key: boolean;
    require_ximilar: boolean;
  };
  cache: {
    hit: boolean;
    version: string;
    key: string | null;
    key_components: {  // NEW: Expose cache key components for debugging
      market: string;
      use_ximilar: boolean;
      hint_colors: string;
    };
  };
  image_normalize: {
    downloaded: boolean;
    uploaded_path: string | null;
    signed: boolean;
    content_type: string | null;
    bytes: number | null;
  };
  ximilar: XimilarDebug;
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
  // Stage-by-stage candidate counts for debugging "why only 10 results"
  counts: {
    lens_visual_in: number;
    lens_visual_after_domain_filter: number;
    shopping_raw_in: number;
    after_dedupe: number;
    with_valid_thumbnail: number;
    cheap_color_likely_n: number;     // NEW: Cheap filter bucket count
    cheap_color_unlikely_n: number;   // NEW: Cheap filter bucket count
    cheap_type_matched_n: number;     // NEW: Items matching target type
    after_rerank: number;
    final_returned: number;
    reranked_top15_n: number;
    top10_has_unreranked_n: number;
    returned_top10_color_pass_n: number;
    returned_top10_type_pass_n: number;    // NEW: Type pass count in top 10
    returned_top10_pattern_pass_n: number; // NEW: Pattern pass count in top 10
    group_a_count: number;  // NEW: Count of Group A (color+type+pattern) results
    group_b_count: number;  // NEW: Count of Group B results
    group_c_count: number;  // NEW: Count of Group C results
    group_d_count: number;  // NEW: Count of Group D results
  };
  filters: {
    before_filter: number;
    dropped_by_category_gate: number;
    dropped_by_color_gate: number;
    dropped_by_visual_threshold: number;
    after_filter: number;
  };
  top5_scores: Array<{ url: string; visual: number; color: number; tag_agree: number; final: number; was_reranked: boolean; color_pass: boolean; type_pass?: boolean; pattern_pass?: boolean; ranking_group?: string }>;
  description_hint_raw: string | null;  // NEW: Raw description from ROI
  description_hint_parsed: ParsedDescriptionHint | null;  // NEW: Structured parsed hint
  ximilar_health: {  // NEW: Ximilar health summary
    enabled: boolean;
    called: boolean;
    success: boolean;
    status_code: number | null;
    plan_hint: 'ok' | 'upgrade_required' | 'disabled' | 'error' | null;
  };
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

function generateTraceId(): string {
  return `trace_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

function hashKey(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `unified_${CACHE_VERSION}_${Math.abs(hash).toString(36)}`;
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

// NEW: Parse description_hint from ROI detection into structured fields
// Converts "long purple and brown printed abaya" → { colors: ['purple', 'brown'], category: 'abaya', pattern: 'printed' }
function parseDescriptionHint(rawDescription: string): ParsedDescriptionHint {
  const result: ParsedDescriptionHint = {
    colors: [],
    category: null,
    pattern: null,
    raw: rawDescription,
  };
  
  if (!rawDescription) return result;
  
  const lowerDesc = rawDescription.toLowerCase();
  
  // Extract colors using the color vocabulary
  result.colors = COLOR_WORDS.filter(color => {
    // Match whole words to avoid partial matches (e.g., "gold" in "golden")
    const regex = new RegExp(`\\b${color}\\b`, 'i');
    return regex.test(lowerDesc);
  }).slice(0, 3);  // Limit to 3 colors max
  
  // Extract category
  for (const cat of CATEGORY_WORDS) {
    const regex = new RegExp(`\\b${cat}\\b`, 'i');
    if (regex.test(lowerDesc)) {
      result.category = cat;
      break;  // Take first match (usually most specific)
    }
  }
  
  // Extract pattern
  for (const pat of PATTERN_WORDS) {
    const regex = new RegExp(`\\b${pat}\\b`, 'i');
    if (regex.test(lowerDesc)) {
      result.pattern = pat;
      break;
    }
  }
  
  return result;
}

// Build hint from parsed description hint
function buildHintFromParsedDescription(parsed: ParsedDescriptionHint): string {
  const parts: string[] = [];
  
  // Pattern first if present
  if (parsed.pattern) {
    parts.push(parsed.pattern);
  }
  
  // Category
  if (parsed.category) {
    parts.push(parsed.category);
  }
  
  // Colors (max 2)
  for (const color of parsed.colors.slice(0, 2)) {
    parts.push(color);
  }
  
  return parts.join(' ');
}

// ============ Cheap Pre-Filters (NO LLM calls) ============

// Map detected colors to color family for cheap filtering
function getColorFamily(colors: string[]): string[] {
  const families: Set<string> = new Set();
  for (const color of colors) {
    const lowerColor = color.toLowerCase();
    for (const [family, members] of Object.entries(COLOR_FAMILIES)) {
      if (members.some(m => lowerColor.includes(m) || m.includes(lowerColor))) {
        families.add(family);
      }
    }
  }
  return Array.from(families);
}

// Cheap color check using title (titles often omit color, so neutral if missing)
function cheapColorCheck(candidateTitle: string, targetFamilies: string[]): 'likely' | 'unknown' | 'unlikely' {
  if (targetFamilies.length === 0) return 'unknown'; // No target = neutral
  
  const lowerTitle = candidateTitle.toLowerCase();
  
  // Check if title contains any color from target families
  for (const family of targetFamilies) {
    const familyColors = COLOR_FAMILIES[family] || [];
    if (familyColors.some(color => lowerTitle.includes(color))) {
      return 'likely';
    }
  }
  
  // Check if title has ANY color words (conflicting color)
  const hasAnyColor = Object.values(COLOR_FAMILIES)
    .flat()
    .some(c => lowerTitle.includes(c));
  
  // If title has a different color, it's unlikely; if no color mentioned, unknown
  return hasAnyColor ? 'unlikely' : 'unknown';
}

// Detect item type from category/description using heuristics
function detectItemType(category: string | null): 'long' | 'top' | 'bottom' | 'accessory' | 'unknown' {
  if (!category) return 'unknown';
  
  const lowerCat = category.toLowerCase();
  
  if (ITEM_TYPE_LONG.some(t => lowerCat.includes(t))) return 'long';
  if (ITEM_TYPE_TOP.some(t => lowerCat.includes(t))) return 'top';
  if (ITEM_TYPE_BOTTOM.some(t => lowerCat.includes(t))) return 'bottom';
  if (ITEM_TYPE_ACCESSORY.some(t => lowerCat.includes(t))) return 'accessory';
  
  return 'unknown';
}

// Cheap type check using title
function cheapTypeCheck(candidateTitle: string, targetType: 'long' | 'top' | 'bottom' | 'accessory' | 'unknown'): boolean {
  if (targetType === 'unknown') return true; // No constraint
  
  const lowerTitle = candidateTitle.toLowerCase();
  
  switch (targetType) {
    case 'long':
      return ITEM_TYPE_LONG.some(t => lowerTitle.includes(t));
    case 'top':
      return ITEM_TYPE_TOP.some(t => lowerTitle.includes(t));
    case 'bottom':
      return ITEM_TYPE_BOTTOM.some(t => lowerTitle.includes(t));
    case 'accessory':
      return ITEM_TYPE_ACCESSORY.some(t => lowerTitle.includes(t));
    default:
      return true;
  }
}

// Compute ranking group based on pass flags (Color → Type → Pattern priority)
function computeRankingGroup(
  colorPass: boolean,
  typePass: boolean,
  patternPass: boolean,
  isPatternRequired: boolean
): 'A' | 'B' | 'C' | 'D' {
  // Group A: Best matches (all requirements met)
  if (colorPass && typePass && (!isPatternRequired || patternPass)) {
    return 'A';
  }
  
  // Group B: Color + Type pass, but pattern not confirmed
  if (colorPass && typePass) {
    return 'B';
  }
  
  // Group C: Color pass but type uncertain
  if (colorPass) {
    return 'C';
  }
  
  // Group D: Everything else
  return 'D';
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

interface XimilarCallResult {
  tags: XimilarTags | null;
  debug: Partial<XimilarDebug>;
}

async function callXimilar(imageUrl: string, apiKey: string): Promise<XimilarCallResult> {
  const debugInfo: Partial<XimilarDebug> = {
    called: true,
    ok: false,
    status: null,
    request_id: null,
    error_text: null,
    latency_ms: 0,
    objects_detected: 0,
    primary_object_reason: null,
    primary_object_area: null,
    primary_object_prob: null,
  };

  const startTime = Date.now();

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

    debugInfo.latency_ms = Date.now() - startTime;
    debugInfo.status = response.status;

    if (!response.ok) {
      const errorText = await response.text();
      debugInfo.error_text = errorText.substring(0, 200);
      console.warn(`[deals-unified] Ximilar API error: ${response.status} - ${debugInfo.error_text}`);
      return { tags: null, debug: debugInfo };
    }

    const data = await response.json();
    debugInfo.ok = true;
    debugInfo.request_id = data._status?.request_id || null;
    
    const record = data.records?.[0];
    
    if (!record?._objects?.length) {
      // Fallback to detect_tags (single item)
      console.log('[deals-unified] Ximilar detect_tags_all returned no objects, trying detect_tags...');
      
      const fallbackStart = Date.now();
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
      
      debugInfo.latency_ms += Date.now() - fallbackStart;
      
      if (!fallbackResponse.ok) {
        debugInfo.error_text = `Fallback failed: ${fallbackResponse.status}`;
        return { tags: null, debug: debugInfo };
      }
      
      const fallbackData = await fallbackResponse.json();
      debugInfo.request_id = fallbackData._status?.request_id || debugInfo.request_id;
      
      const result = parseXimilarResponse(fallbackData.records?.[0], false, debugInfo);
      return { tags: result, debug: debugInfo };
    }

    // Select primary object: largest area OR highest probability
    const objects = record._objects;
    debugInfo.objects_detected = objects.length;
    
    const primaryObject = selectPrimaryObject(objects, debugInfo);
    
    const result = parseXimilarResponse({ ...record, _selectedObject: primaryObject }, true, debugInfo);
    return { tags: result, debug: debugInfo };
    
  } catch (err) {
    debugInfo.latency_ms = Date.now() - startTime;
    debugInfo.error_text = err instanceof Error ? err.message : String(err);
    console.error('[deals-unified] Ximilar error:', err);
    return { tags: null, debug: debugInfo };
  }
}

// Select primary object by largest area and/or highest probability
function selectPrimaryObject(objects: any[], debugInfo: Partial<XimilarDebug>): any {
  if (!objects || objects.length === 0) return null;
  if (objects.length === 1) {
    debugInfo.primary_object_reason = 'only_object';
    return objects[0];
  }

  // Prefer clothing items over accessories/bags if present
  const clothingCategories = ['clothing', 'dress', 'top', 'pants', 'skirt', 'jacket', 'coat', 'shirt', 'blouse'];
  
  // Calculate area and prob for each object
  const scored = objects.map((obj, index) => {
    const bbox = obj._bounding_box || {};
    const area = (bbox.width || 0) * (bbox.height || 0);
    const prob = obj._prob || obj.prob || 0;
    
    // Check if it's a clothing item
    const topCategory = obj._tags?.['Top Category']?.[0]?.name?.toLowerCase() || '';
    const category = obj._tags?.['Category']?.[0]?.name?.toLowerCase() || '';
    const isClothing = clothingCategories.some(c => topCategory.includes(c) || category.includes(c));
    
    return { obj, index, area, prob, isClothing };
  });

  // Sort by: clothing first, then by area * prob
  scored.sort((a, b) => {
    if (a.isClothing && !b.isClothing) return -1;
    if (!a.isClothing && b.isClothing) return 1;
    return (b.area * b.prob) - (a.area * a.prob);
  });

  const selected = scored[0];
  debugInfo.primary_object_reason = selected.isClothing 
    ? `clothing_item_area_${selected.area.toFixed(2)}`
    : `largest_area_prob_${selected.area.toFixed(2)}_${selected.prob.toFixed(2)}`;
  debugInfo.primary_object_area = selected.area;
  debugInfo.primary_object_prob = selected.prob;

  return selected.obj;
}

function parseXimilarResponse(record: any, isAllMode: boolean, debugInfo: Partial<XimilarDebug>): XimilarTags | null {
  if (!record) return null;
  
  try {
    // For detect_tags_all, use the selected object
    const object = isAllMode ? (record._selectedObject || record._objects?.[0]) : record;
    const tags = object?._tags || record?._tags || {};
    const tagsMap = object?._tags_map || record?._tags_map || {};
    
    // Extract category - check multiple possible keys
    const categoryTag = tags['Category']?.[0] || tags['Top Category']?.[0] || tagsMap['Category']?.[0];
    const subcategoryTag = tags['Subcategory']?.[0] || tags['Best Category']?.[0] || tagsMap['Subcategory']?.[0];
    
    // Extract colors - check multiple possible keys (Color, Dominant Color)
    const colorTags = tags['Dominant Color'] || tags['Color'] || tagsMap['Color'] || [];
    const colors = colorTags
      .filter((c: any) => c.prob >= 0.1)
      .slice(0, 3)
      .map((c: any) => ({
        name: c.name?.toLowerCase() || '',
        probability: c.prob || 0,
      }));
    
    // Extract patterns - check Design, Pattern, Print
    const patternTags = tags['Pattern'] || tags['Design'] || tags['Print'] || tagsMap['Design'] || [];
    const patterns = patternTags
      .filter((p: any) => p.prob >= 0.3 && p.name?.toLowerCase() !== 'solid')
      .map((p: any) => p.name?.toLowerCase() || '')
      .filter(Boolean);
    
    // Extract materials
    const materialTags = tags['Material'] || tags['Fabric'] || tagsMap['Material'] || [];
    const materials = materialTags
      .filter((m: any) => m.prob >= 0.3)
      .map((m: any) => m.name?.toLowerCase() || '')
      .filter(Boolean);
    
    // Extract style
    const styleTags = tags['Style'] || tags['Occasion'] || tagsMap['Style'] || [];
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
    
    // Determine pattern mode - has non-solid pattern with decent confidence
    const is_pattern_mode = patterns.length > 0;
    
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
    debugInfo.error_text = `Parse error: ${err instanceof Error ? err.message : String(err)}`;
    return null;
  }
}

// ============ Main Handler ============

serve(async (req) => {
  // Generate trace_id immediately for all requests
  const traceId = generateTraceId();
  const startTime = Date.now();

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Initialize debug with trace_id at the very top
  const debug: DebugInfo = {
    trace_id: traceId,
    entry: {
      source: 'unknown',
      has_image_url: false,
      has_image_base64: false,
      has_page_url: false,
      has_title_hint: false,
      has_description_hint: false,
      has_ximilar_key: false,
      require_ximilar: false,
    },
    cache: {
      hit: false,
      version: CACHE_VERSION,
      key: null,
      key_components: {
        market: 'AE',
        use_ximilar: USE_XIMILAR,
        hint_colors: '',
      },
    },
    image_normalize: { downloaded: false, uploaded_path: null, signed: false, content_type: null, bytes: null },
    ximilar: { 
      called: false, 
      ok: false,
      status: null,
      request_id: null,
      error_text: null,
      latency_ms: 0, 
      objects_detected: 0, 
      primary_object_reason: null,
      primary_object_area: null,
      primary_object_prob: null,
      tags_summary: '', 
      roi_box_present: false, 
      is_pattern_mode: false,
      failed: false,
      fallback_used: false,
    },
    serpapi: { lens_ran: false, exact_count: 0, visual_count: 0, chips_used: 0, shopping_queries: [], shopping_result_count: 0, market: 'AE' },
    rerank: { sent_count: 0, scored_count: 0, filtered_count: 0, min_thresholds_used: { visual: 0.40, pattern: 0.50 } },
    counts: { 
      lens_visual_in: 0, 
      lens_visual_after_domain_filter: 0, 
      shopping_raw_in: 0, 
      after_dedupe: 0, 
      with_valid_thumbnail: 0,
      cheap_color_likely_n: 0,
      cheap_color_unlikely_n: 0,
      cheap_type_matched_n: 0,
      after_rerank: 0, 
      final_returned: 0,
      reranked_top15_n: 0,
      top10_has_unreranked_n: 0,
      returned_top10_color_pass_n: 0,
      returned_top10_type_pass_n: 0,
      returned_top10_pattern_pass_n: 0,
      group_a_count: 0,
      group_b_count: 0,
      group_c_count: 0,
      group_d_count: 0,
    },
    filters: { before_filter: 0, dropped_by_category_gate: 0, dropped_by_color_gate: 0, dropped_by_visual_threshold: 0, after_filter: 0 },
    top5_scores: [],
    description_hint_raw: null,
    description_hint_parsed: null,
    ximilar_health: {
      enabled: USE_XIMILAR,
      called: false,
      success: false,
      status_code: null,
      plan_hint: null,
    },
    timing_ms: { image_normalize: 0, ximilar: 0, lens: 0, chips: 0, shopping: 0, rerank: 0, total: 0 },
  };

  try {
    // Parse input FIRST to populate entry debug
    let input: UnifiedInput;
    try {
      input = await req.json();
    } catch {
      input = { source: 'app_upload', market: 'AE' };
    }

    // Get API keys
    const SERPAPI_KEY = Deno.env.get('SERPAPI_API_KEY');
    const XIMILAR_KEY = Deno.env.get('XIMILAR_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    // Populate entry debug immediately
    debug.entry = {
      source: input.source || 'unknown',
      has_image_url: !!input.image_url,
      has_image_base64: !!input.image_base64,
      has_page_url: !!input.page_url,
      has_title_hint: !!input.title_hint,
      has_description_hint: !!input.description_hint,
      has_ximilar_key: !!XIMILAR_KEY,
      require_ximilar: !!input.require_ximilar,
    };

    // Parse description_hint into structured fields (NEW)
    let parsedDescHint: ParsedDescriptionHint | null = null;
    if (input.description_hint) {
      parsedDescHint = parseDescriptionHint(input.description_hint);
      debug.description_hint_raw = input.description_hint;
      debug.description_hint_parsed = parsedDescHint;
    }

    // Log entry IMMEDIATELY before any early returns
    console.log(`[deals-unified] ENTRY trace_id=${traceId} source=${input.source} has_image_url=${!!input.image_url} has_image_base64=${!!input.image_base64} has_page_url=${!!input.page_url} has_desc_hint=${!!input.description_hint} has_ximilar_key=${!!XIMILAR_KEY}`);
    
    if (!SERPAPI_KEY) {
      throw new Error('SERPAPI_API_KEY not configured');
    }

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log(`[deals-unified] ${traceId} AUTH_FAIL: No Authorization header`);
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required', debug: { trace_id: traceId } }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.log(`[deals-unified] ${traceId} AUTH_FAIL: Invalid token`);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token', debug: { trace_id: traceId } }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limit
    const allowed = await checkRateLimit(supabase, user.id);
    if (!allowed) {
      console.log(`[deals-unified] ${traceId} RATE_LIMIT user=${user.id}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again in a minute.', debug: { trace_id: traceId } }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const market = input.market || 'AE';
    const marketParams = getMarketParams(market);
    debug.serpapi.market = market;

    console.log(`[deals-unified] ${traceId} PROCESSING user=${user.id} source=${input.source} market=${market}`);

    // ============ STAGE 1: Image Normalization ============
    const normalizeStart = Date.now();
    let signedImageUrl: string | null = null;

    if (input.image_base64) {
      // Upload base64 to storage
      console.log(`[deals-unified] ${traceId} Uploading base64 image...`);
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
        console.log(`[deals-unified] ${traceId} Downloading external image...`);
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
          console.warn(`[deals-unified] ${traceId} Image download failed:`, err);
          // Fall back to original URL
          signedImageUrl = input.image_url;
        }
      }
    }

    debug.timing_ms.image_normalize = Date.now() - normalizeStart;

    if (!signedImageUrl) {
      console.log(`[deals-unified] ${traceId} NO_IMAGE`);
      return new Response(
        JSON.stringify({ success: false, error: 'No valid image provided', debug }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check cache with versioned key that includes hint colors + ximilar flag
    const hintColorsForKey = parsedDescHint?.colors?.join(',') || '';
    const cacheKeyComponents = `${signedImageUrl}|${market}|${USE_XIMILAR}|${hintColorsForKey}`;
    const cacheKey = hashKey(cacheKeyComponents);
    debug.cache.key = cacheKey;
    debug.cache.key_components = {
      market,
      use_ximilar: USE_XIMILAR,
      hint_colors: hintColorsForKey,
    };
    
    const cached = await getCache(supabase, cacheKey);
    if (cached) {
      console.log(`[deals-unified] ${traceId} CACHE_HIT key=${cacheKey}`);
      debug.cache.hit = true;
      
      // Return cached response with updated debug info
      return new Response(
        JSON.stringify({ 
          ...cached, 
          cached: true,
          debug: {
            ...cached.debug,
            trace_id: traceId,
            cache: { hit: true, version: CACHE_VERSION, key: cacheKey, key_components: debug.cache.key_components },
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ STAGE 2: Ximilar Tagging ============
    const ximilarStart = Date.now();
    let ximilarTags: XimilarTags | null = null;
    let useXimilar = USE_XIMILAR;

    // Only call Ximilar if feature flag is enabled
    if (!USE_XIMILAR) {
      console.log(`[deals-unified] ${traceId} XIMILAR disabled via USE_XIMILAR=false`);
      debug.ximilar.error_text = 'Disabled via USE_XIMILAR feature flag';
      debug.ximilar_health = {
        enabled: false,
        called: false,
        success: false,
        status_code: null,
        plan_hint: 'disabled',
      };
      useXimilar = false;
    } else if (XIMILAR_KEY) {
      console.log(`[deals-unified] ${traceId} XIMILAR calling...`);
      
      const ximilarResult = await callXimilar(signedImageUrl, XIMILAR_KEY);
      
      // Merge ximilar debug info
      Object.assign(debug.ximilar, ximilarResult.debug);
      ximilarTags = ximilarResult.tags;
      
      // Update ximilar_health
      debug.ximilar_health = {
        enabled: true,
        called: true,
        success: !!ximilarTags,
        status_code: debug.ximilar.status,
        plan_hint: debug.ximilar.status === 403 ? 'upgrade_required' : (ximilarTags ? 'ok' : 'error'),
      };
      
      if (ximilarTags) {
        debug.ximilar.is_pattern_mode = ximilarTags.is_pattern_mode;
        debug.ximilar.roi_box_present = !!ximilarTags.roi_box;
        debug.ximilar.tags_summary = `${ximilarTags.primary_category || 'unknown'}, colors: [${ximilarTags.colors.map(c => c.name).join(',')}], patterns: [${ximilarTags.pattern_tags.join(',')}]`;
        console.log(`[deals-unified] ${traceId} XIMILAR called=true ok=true status=${debug.ximilar.status} tags="${debug.ximilar.tags_summary}"`);
      } else {
        debug.ximilar.failed = true;
        useXimilar = false;
        console.log(`[deals-unified] ${traceId} XIMILAR called=true ok=${debug.ximilar.ok} status=${debug.ximilar.status} error="${debug.ximilar.error_text}"`);
        
        // Strict mode: fail if Ximilar required but failed
        if (input.require_ximilar) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Ximilar tagging failed (strict mode enabled)', 
              debug 
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    } else {
      console.log(`[deals-unified] ${traceId} XIMILAR key not configured, using fallback`);
      useXimilar = false;
      debug.ximilar.error_text = 'XIMILAR_API_KEY not configured';
      debug.ximilar_health = {
        enabled: USE_XIMILAR,
        called: false,
        success: false,
        status_code: null,
        plan_hint: 'error',
      };
      
      // Strict mode: fail if Ximilar required but key missing
      if (input.require_ximilar) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Ximilar API key not configured (strict mode enabled)', 
            debug 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    debug.timing_ms.ximilar = Date.now() - ximilarStart;

    // ============ STAGE 3: SerpApi Discovery ============
    const lensStart = Date.now();
    
    let exactMatch: any = null;
    const visualMatches: any[] = [];
    const visualMatchTitles: string[] = [];
    const chipsToLoop: string[] = [];

    // 3a. Run Google Lens
    console.log(`[deals-unified] ${traceId} Running Google Lens...`);
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
        console.log(`[deals-unified] ${traceId} Found exact match: ${exactMatch.source}`);
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
      console.error(`[deals-unified] ${traceId} Lens error:`, err);
    }

    debug.timing_ms.lens = Date.now() - lensStart;

    // 3b. Chip looping (max 2 chips)
    const chipStart = Date.now();
    if (chipsToLoop.length > 0) {
      console.log(`[deals-unified] ${traceId} Looping ${chipsToLoop.length} chips...`);
      
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
          console.warn(`[deals-unified] ${traceId} Chip loop error:`, err);
        }
      }
    }
    debug.timing_ms.chips = Date.now() - chipStart;

    // ============ Build search queries ============
    let hintString = '';
    let fallbackDescriptors = { colors: [] as string[], categories: [] as string[], patterns: [] as string[], fabrics: [] as string[] };
    
    if (useXimilar && ximilarTags) {
      hintString = buildHintFromXimilar(ximilarTags);
    } else if (parsedDescHint && (parsedDescHint.colors.length > 0 || parsedDescHint.category)) {
      // NEW: Use parsed description_hint from ROI detection (structured, not raw)
      hintString = buildHintFromParsedDescription(parsedDescHint);
      // Also merge parsed colors/patterns into fallback descriptors for scoring
      fallbackDescriptors.colors = parsedDescHint.colors;
      fallbackDescriptors.categories = parsedDescHint.category ? [parsedDescHint.category] : [];
      fallbackDescriptors.patterns = parsedDescHint.pattern ? [parsedDescHint.pattern] : [];
      debug.ximilar.fallback_used = true;
      console.log(`[deals-unified] ${traceId} Using parsed description_hint: "${hintString}"`);
    } else {
      // Fallback to descriptor extraction from visual match titles
      fallbackDescriptors = extractDescriptors([...visualMatchTitles, input.title_hint || '']);
      hintString = buildHintFromDescriptors(
        fallbackDescriptors.colors,
        fallbackDescriptors.categories,
        fallbackDescriptors.patterns
      );
      debug.ximilar.fallback_used = true;
    }

    console.log(`[deals-unified] ${traceId} Query hint: "${hintString}"`);

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

    // ============ 3c. Shopping searches (parallelized) ============
    const shoppingStart = Date.now();
    const allShoppingResults: ShoppingResult[] = [];
    const seenKeys = new Set<string>();

    // Run all shopping queries in parallel for faster results
    const shoppingPromises = uniqueQueries
      .filter(query => !!query)
      .map(async (query) => {
        const shoppingParams = new URLSearchParams({
          engine: 'google_shopping',
          q: query,
          api_key: SERPAPI_KEY,
          gl: marketParams.gl,
          hl: 'en',
          location: marketParams.location,
        });

        console.log(`[deals-unified] ${traceId} Shopping: "${query.substring(0, 40)}..."`);
        const shoppingResponse = await fetch(`https://serpapi.com/search?${shoppingParams.toString()}`);
        const shoppingData = await shoppingResponse.json();
        return { query, data: shoppingData };
      });

    const shoppingResults = await Promise.allSettled(shoppingPromises);

    // Process results from all parallel queries
    for (const result of shoppingResults) {
      if (result.status === 'fulfilled') {
        const allResults = mergeShoppingArrays(result.value.data);
        debug.serpapi.shopping_result_count += allResults.length;

        for (const item of allResults.slice(0, 15)) {
          const key = dedupKey(item);
          if (!key || seenKeys.has(key)) continue;
          seenKeys.add(key);

          allShoppingResults.push({
            title: item.title || '',
            link: normalizeLink(item.link),
            thumbnail: item.image || item.thumbnail || '',
            source: item.source || '',
            price: item.price || '',
            extracted_price: item.extracted_price ?? extractNumericPrice(item.price),
            rating: item.rating || undefined,
            reviews: item.reviews || undefined,
            position: allShoppingResults.length + 1,
          });
        }
      } else {
        console.warn(`[deals-unified] ${traceId} Shopping error:`, result.reason);
      }
    }

    debug.timing_ms.shopping = Date.now() - shoppingStart;
    debug.filters.before_filter = allShoppingResults.length;
    debug.counts.shopping_raw_in = debug.serpapi.shopping_result_count;
    debug.counts.after_dedupe = allShoppingResults.length;

    // ============ STAGE 4: Visual Rerank ============
    const rerankStart = Date.now();
    const isPatternMode = useXimilar ? (ximilarTags?.is_pattern_mode || false) : (fallbackDescriptors.patterns.length > 0);
    
    // Set thresholds based on mode
    const minVisualThreshold = isPatternMode ? 0.50 : 0.40;
    const minPatternThreshold = isPatternMode ? 0.50 : 0;
    debug.rerank.min_thresholds_used = { visual: minVisualThreshold, pattern: minPatternThreshold };

    // Track valid thumbnails for debugging
    const validThumbnailResults = allShoppingResults.filter(r => r.thumbnail && r.thumbnail.startsWith('http'));
    debug.counts.with_valid_thumbnail = validThumbnailResults.length;

    if (allShoppingResults.length >= 5 && LOVABLE_API_KEY) {
      // Increase rerank coverage to 40 (was 30) to have more candidates after filtering
      const RERANK_LIMIT = 40;
      console.log(`[deals-unified] ${traceId} Running visual rerank on ${Math.min(validThumbnailResults.length, RERANK_LIMIT)} results, patternMode=${isPatternMode}...`);
      
      try {
        const topResults = validThumbnailResults.slice(0, RERANK_LIMIT);
        debug.rerank.sent_count = topResults.length;

        if (topResults.length >= 5) {
          const rerankResponse = await fetch(`${supabaseUrl}/functions/v1/visual-rerank`, {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              queryImageUrl: signedImageUrl,
              isPatternMode,
              results: topResults.map(r => ({
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
                  result.was_reranked = true;  // NEW: Mark as reranked
                  
                  // Track filtered but don't hard-drop (soft gate per user's tweak)
                  if (vr.filtered) {
                    debug.rerank.filtered_count++;
                  }
                }
              }
              debug.counts.after_rerank = rerankData.results.length;
            }
          }
        }
      } catch (err) {
        console.warn(`[deals-unified] ${traceId} Visual rerank failed:`, err);
      }
    }

    debug.timing_ms.rerank = Date.now() - rerankStart;

    // ============ STAGE 5: Priority-Group Ranking (Color → Type → Pattern → Silhouette) ============
    const ximilarColors = useXimilar && ximilarTags ? ximilarTags.colors.map(c => c.name) : fallbackDescriptors.colors;
    const ximilarCategory = useXimilar && ximilarTags ? (ximilarTags.subcategory || ximilarTags.primary_category) : fallbackDescriptors.categories[0];
    const ximilarPatterns = useXimilar && ximilarTags ? ximilarTags.pattern_tags : fallbackDescriptors.patterns;
    
    // Determine target item type and color families for cheap filtering
    const targetItemType = detectItemType(ximilarCategory || parsedDescHint?.category || null);
    const targetColorFamilies = getColorFamily(ximilarColors.length > 0 ? ximilarColors : (parsedDescHint?.colors || []));
    const isPatternRequired = isPatternMode && (ximilarPatterns.length > 0 || parsedDescHint?.pattern);
    
    console.log(`[deals-unified] ${traceId} Target: type=${targetItemType}, colors=${targetColorFamilies.join(',')}, patternRequired=${isPatternRequired}`);

    // Apply cheap pre-filters and compute tag agreement
    let cheapColorLikelyN = 0;
    let cheapColorUnlikelyN = 0;
    let cheapTypeMatchedN = 0;
    
    for (const result of allShoppingResults) {
      const resultTitle = (result.title || '').toLowerCase();
      const visualScore = result.similarity_score ?? 0;
      const colorSubScore = result.sub_scores?.color ?? 0;
      const patternSubScore = result.sub_scores?.pattern ?? 0;
      const silhouetteSubScore = result.sub_scores?.silhouette ?? 0;
      
      // Cheap color bucket (for debugging, not hard-filtering)
      result.cheap_color_bucket = cheapColorCheck(resultTitle, targetColorFamilies);
      if (result.cheap_color_bucket === 'likely') cheapColorLikelyN++;
      if (result.cheap_color_bucket === 'unlikely') cheapColorUnlikelyN++;
      
      // Cheap type bucket
      result.cheap_type_bucket = targetItemType;
      const typeMatchesTitle = cheapTypeCheck(resultTitle, targetItemType);
      if (typeMatchesTitle) cheapTypeMatchedN++;
      
      let tagAgreement = 0;
      
      // Category/type match (soft - 0.15-0.25)
      if (ximilarCategory) {
        const categoryMatch = resultTitle.includes(ximilarCategory.toLowerCase());
        if (categoryMatch) {
          tagAgreement += isPatternMode ? 0.15 : 0.25;
        } else if (visualScore < 0.70) {
          debug.filters.dropped_by_category_gate++;
        }
      }
      
      // Color match: VISUAL-FIRST per audit (image-based color score is primary)
      if (ximilarColors.length > 0) {
        const titleHasColor = ximilarColors.some(c => resultTitle.includes(c));
        
        if (colorSubScore >= 0.60) {
          tagAgreement += isPatternMode ? 0.30 : 0.40;
        } else if (colorSubScore >= 0.45) {
          tagAgreement += isPatternMode ? 0.20 : 0.30;
          if (titleHasColor) tagAgreement += 0.10;
        } else if (colorSubScore >= 0.30) {
          if (titleHasColor) tagAgreement += isPatternMode ? 0.15 : 0.20;
        } else if (colorSubScore > 0 && colorSubScore < 0.25) {
          debug.filters.dropped_by_color_gate++;
          tagAgreement -= 0.25;
        } else if (!titleHasColor && colorSubScore === 0) {
          debug.filters.dropped_by_color_gate++;
          tagAgreement -= 0.15;
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
      
      // Check for exact match (extension mode only)
      if (input.source === 'chrome_extension' && input.page_url) {
        const pageDomain = extractDomain(input.page_url);
        const resultDomain = extractDomain(result.link);
        if (pageDomain && resultDomain && pageDomain === resultDomain && visualScore >= 0.60) {
          result.is_exact_match = true;
        }
      }
    }
    
    // Update cheap filter counts
    debug.counts.cheap_color_likely_n = cheapColorLikelyN;
    debug.counts.cheap_color_unlikely_n = cheapColorUnlikelyN;
    debug.counts.cheap_type_matched_n = cheapTypeMatchedN;

    // Final scoring + pass computation with STRICT PRIORITY ordering
    let groupACnt = 0, groupBCnt = 0, groupCCnt = 0, groupDCnt = 0;
    
    for (const result of allShoppingResults) {
      const visualScore = result.similarity_score ?? 0.3;
      const tagAgreement = result.tag_agreement ?? 0;
      const exactBonus = result.is_exact_match ? 0.10 : 0;
      
      // Compute final score blend
      if (isPatternMode) {
        result.similarity_score = (visualScore * 0.65) + (tagAgreement * 0.25) + exactBonus;
      } else {
        result.similarity_score = (visualScore * 0.60) + (tagAgreement * 0.30) + exactBonus;
      }
      
      // Compute pass flags - ONLY for reranked items with real scores
      const colorSubScore = result.sub_scores?.color ?? 0;
      const patternSubScore = result.sub_scores?.pattern ?? 0;
      const silhouetteSubScore = result.sub_scores?.silhouette ?? 0;
      
      if (result.was_reranked && colorSubScore > 0) {
        // Color pass: PRIMARY ranking criterion
        result.color_pass = colorSubScore >= COLOR_PASS_THRESHOLD;
        
        // Type pass: Use silhouette as proxy (tall/narrow = long garment, short/wide = top/accessory)
        // Combined with title type detection for better accuracy
        const titleTypeMatch = cheapTypeCheck(result.title, targetItemType);
        const silhouetteTypeMatch = silhouetteSubScore >= TYPE_PASS_THRESHOLD;
        result.type_pass = titleTypeMatch || silhouetteTypeMatch;
        
        // Pattern pass: For pattern-required searches
        if (isPatternRequired) {
          const titlePatternMatch = ximilarPatterns.some(p => result.title.toLowerCase().includes(p));
          result.pattern_pass = patternSubScore >= PATTERN_PASS_THRESHOLD || titlePatternMatch;
        } else {
          result.pattern_pass = true;  // Not required, auto-pass
        }
      } else {
        // Non-reranked items: cannot meet criteria
        result.color_pass = false;
        result.type_pass = false;
        result.pattern_pass = !isPatternRequired;  // Only fail if pattern was required
      }
      
      // Compute ranking group (strict priority: Color → Type → Pattern)
      result.ranking_group = computeRankingGroup(
        result.color_pass ?? false,
        result.type_pass ?? false,
        result.pattern_pass ?? false,
        !!isPatternRequired
      );
      
      // Track group counts
      switch (result.ranking_group) {
        case 'A': groupACnt++; break;
        case 'B': groupBCnt++; break;
        case 'C': groupCCnt++; break;
        case 'D': groupDCnt++; break;
      }
    }
    
    debug.counts.group_a_count = groupACnt;
    debug.counts.group_b_count = groupBCnt;
    debug.counts.group_c_count = groupCCnt;
    debug.counts.group_d_count = groupDCnt;

    // PRIORITY-GROUP SORT: A > B > C > D, then by similarity_score within each group
    // This guarantees: Top 10 comes from Group A if available, then B, then C, never D unless necessary
    allShoppingResults.sort((a, b) => {
      const groupOrder = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
      const aGroup = groupOrder[a.ranking_group ?? 'D'];
      const bGroup = groupOrder[b.ranking_group ?? 'D'];
      
      // First: sort by group (A first, D last)
      if (aGroup !== bGroup) {
        return aGroup - bGroup;
      }
      
      // Second: within same group, sort by final score
      return (b.similarity_score ?? 0) - (a.similarity_score ?? 0);
    });
    
    // Update positions
    allShoppingResults.forEach((result, index) => {
      result.position = index + 1;
    });
    
    // Compute key acceptance metrics
    const top10 = allShoppingResults.slice(0, 10);
    const top15 = allShoppingResults.slice(0, 15);
    debug.counts.returned_top10_color_pass_n = top10.filter(r => r.color_pass).length;
    debug.counts.returned_top10_type_pass_n = top10.filter(r => r.type_pass).length;
    debug.counts.returned_top10_pattern_pass_n = top10.filter(r => r.pattern_pass).length;
    debug.counts.top10_has_unreranked_n = top10.filter(r => !r.was_reranked).length;
    debug.counts.reranked_top15_n = top15.filter(r => r.was_reranked).length;

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

    // ============ Top 5 scores for debug (enhanced with type/pattern/group) ============
    debug.top5_scores = allShoppingResults.slice(0, 5).map(r => ({
      url: r.link.substring(0, 60),
      visual: r.sub_scores ? (r.sub_scores.pattern + r.sub_scores.silhouette + r.sub_scores.color) / 3 : 0,
      color: r.sub_scores?.color ?? 0,
      tag_agree: r.tag_agreement ?? 0,
      final: r.similarity_score ?? 0,
      was_reranked: r.was_reranked ?? false,
      color_pass: r.color_pass ?? false,
      type_pass: r.type_pass ?? false,
      pattern_pass: r.pattern_pass ?? false,
      ranking_group: r.ranking_group ?? 'D',
    }));
    
    // Set final count
    debug.counts.final_returned = Math.min(allShoppingResults.length, 30);

    debug.timing_ms.total = Date.now() - startTime;

    // ============ Store search run (async) ============
    Promise.resolve(supabase.from('deals_search_runs').insert({
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
    })).then(() => {}).catch((err: any) => console.warn(`[deals-unified] ${traceId} Failed to log search run:`, err));

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

    console.log(`[deals-unified] ${traceId} SUCCESS deals=${allShoppingResults.length} ximilar_ok=${debug.ximilar.ok} time=${debug.timing_ms.total}ms`);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error(`[deals-unified] ${traceId} ERROR:`, error);
    debug.timing_ms.total = Date.now() - startTime;
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        shopping_results: [],
        visual_matches: [],
        price_stats: { low: null, median: null, high: null, valid_count: 0 },
        deals_found: 0,
        debug,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
