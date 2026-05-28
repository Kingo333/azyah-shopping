// Gemini Vision garment analyzer — primary detailed metadata provider.
// Background-safe: callable by DB trigger (x-trigger-secret) or signed-in user.
// Dedup: by normalized image URL hash. Fan-out: reuses metadata across rows sharing the same image.
// Never blocks uploads or Live Cam. FashionCLIP and existing prompt_hint remain as fallback.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-trigger-secret',
};

const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash';
const GEMINI_VERSION = `gemini-vision-v1:${GEMINI_MODEL}`;
const ANALYSIS_VERSION = `gemini-vision-v1`;
const GEMINI_TIMEOUT_MS = Number(Deno.env.get('GEMINI_TIMEOUT_MS') ?? '60000') || 60_000;
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

interface Body {
  wardrobe_item_id?: string;
  force?: boolean;
}

// Normalize a URL for stable hashing across signed/transient variants.
function normalizeUrlForHash(raw: string): string {
  let v = (raw ?? '').trim();
  if (!v) return '';
  try {
    const u = new URL(v);
    // Strip query strings (signed URLs include token & expiry that change per fetch).
    u.search = '';
    u.hash = '';
    // Trailing slash off.
    let s = u.toString();
    if (s.endsWith('/')) s = s.slice(0, -1);
    return s;
  } catch {
    return v.replace(/[?#].*$/, '').replace(/\/+$/, '');
  }
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const GEMINI_TRIGGER_SECRET = Deno.env.get('GEMINI_TRIGGER_SECRET') ?? '';

// Cache the vault-stored trigger secret so we don't hit the RPC on every request.
let cachedVaultTriggerSecret: string | null = null;
let cachedVaultTriggerSecretAt = 0;
const VAULT_CACHE_TTL_MS = 5 * 60_000;

async function getVaultTriggerSecret(): Promise<string> {
  const now = Date.now();
  if (cachedVaultTriggerSecret && now - cachedVaultTriggerSecretAt < VAULT_CACHE_TTL_MS) {
    return cachedVaultTriggerSecret;
  }
  try {
    const { data, error } = await admin.rpc('get_gemini_trigger_secret');
    if (!error && typeof data === 'string' && data.length > 0) {
      cachedVaultTriggerSecret = data;
      cachedVaultTriggerSecretAt = now;
      return data;
    }
  } catch (_e: any) {
    // ignore — fall back to env-only comparison
  }
  return '';
}

type AuthMode = 'trigger_secret' | 'user_jwt' | 'none';

async function authorize(req: Request, itemUserId: string): Promise<AuthMode> {
  const trig = req.headers.get('x-trigger-secret');
  if (trig) {
    if (GEMINI_TRIGGER_SECRET && trig === GEMINI_TRIGGER_SECRET) return 'trigger_secret';
    const vaultSecret = await getVaultTriggerSecret();
    if (vaultSecret && trig === vaultSecret) return 'trigger_secret';
  }
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return 'none';
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const { data, error } = await userClient.auth.getClaims(auth.replace('Bearer ', ''));
  if (error || !data?.claims) return 'none';
  if (data.claims.sub !== itemUserId) return 'none';
  return 'user_jwt';
}

const GEMINI_PROMPT = `Analyze this garment image for live virtual try-on. Return only strict JSON matching the schema.

Do not guess details you cannot see. Use "unknown" when uncertain.

Focus on visual facts that help a try-on model preserve the garment accurately:
- category
- garment type
- sleeve length
- garment length
- neckline/collar
- cuffs
- hem
- closures
- dominant colors
- accent colors
- pattern placement
- material appearance
- logo/text
- silhouette
- body region to replace
- body regions to preserve

Also describe how the fabric looks and behaves (general garment attributes, not just prints):
- material_appearance (knit, woven, denim, satin-like, chiffon-like, jersey, cotton-like, linen-like, leather-like, lace, mesh, unknown)
- surface_texture (ribbed, smooth, fuzzy, quilted, pleated, crinkled, crocheted, embroidered, textured, glossy, matte, unknown)
- fabric_structure (flowy, draped, soft, structured, stiff, tailored, unknown)
- fabric_weight (lightweight, midweight, heavy, unknown)
- opacity (opaque, semi-sheer, sheer, unknown)
- finish (matte, slightly glossy, glossy, metallic, brushed, unknown)
- construction_details (ribbing, pleats, ruffles, smocking, quilting, gathering, layering, embroidery, lace overlay, visible seams)
- texture_confidence (0.0 to 1.0)
Use "unknown" when not clearly visible. Do not invent.

Also describe placement, color distribution, fabric/texture, and the highest-priority visual details for try-on preservation. Fill color_profile, fabric_texture_profile, design_placement_profile, priority_details (top 3-6 short phrases, preserve original casing for logos/text like "AF1", "NYC", "Nike"), and uncertain_fields. Use "unknown" inside any field you cannot clearly see. The reference image is the source of truth - do not guess details that are not visible.

The reference image is the source of truth.

The tryon_prompt_hint must tell FluxRT exactly what to preserve from the reference image.

Do not invent a different garment.
Do not add unrelated styling.
Do not change category if uncertain.`;


const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    provider: { type: 'string' },
    confidence: { type: 'number' },
    category: { type: 'string' },
    garment_type: { type: 'string' },
    sleeve_length: { type: 'string' },
    garment_length: { type: 'string' },
    neckline_or_collar: { type: 'string' },
    cuffs: { type: 'string' },
    hem_details: { type: 'string' },
    closure_details: { type: 'string' },
    fit_or_silhouette: { type: 'string' },
    main_colors: { type: 'array', items: { type: 'string' } },
    accent_colors: { type: 'array', items: { type: 'string' } },
    color_palette_description: { type: 'string' },
    pattern_type: { type: 'string' },
    pattern_placement: { type: 'string' },
    material_appearance: { type: 'string' },
    surface_texture: { type: 'string' },
    fabric_structure: { type: 'string' },
    fabric_weight: { type: 'string' },
    opacity: { type: 'string' },
    finish: { type: 'string' },
    construction_details: { type: 'array', items: { type: 'string' } },
    texture_confidence: { type: 'number' },
    logo_or_text: { type: 'boolean' },
    visible_text: { type: 'array', items: { type: 'string' } },
    important_visual_details: { type: 'array', items: { type: 'string' } },
    body_region_to_replace: { type: 'string' },
    body_regions_to_preserve: { type: 'array', items: { type: 'string' } },
    tryon_prompt_hint: { type: 'string' },
    color_profile: {
      type: 'object',
      properties: {
        base_color: { type: 'string' },
        primary_colors: { type: 'array', items: { type: 'string' } },
        accent_colors: { type: 'array', items: { type: 'string' } },
        pattern_colors: { type: 'array', items: { type: 'string' } },
        trim_colors: { type: 'array', items: { type: 'string' } },
        color_distribution: { type: 'string' },
        gradient_or_ombre: { type: 'string' },
        color_blocking: { type: 'string' },
        color_confidence: { type: 'number' },
      },
    },
    fabric_texture_profile: {
      type: 'object',
      properties: {
        material_appearance: { type: 'string' },
        surface_texture: { type: 'string' },
        fabric_structure: { type: 'string' },
        fabric_weight: { type: 'string' },
        opacity: { type: 'string' },
        finish: { type: 'string' },
        construction_details: { type: 'array', items: { type: 'string' } },
        texture_confidence: { type: 'number' },
      },
    },
    design_placement_profile: {
      type: 'object',
      properties: {
        main_design_location: { type: 'string' },
        pattern_distribution: { type: 'string' },
        design_scale: { type: 'string' },
        design_orientation: { type: 'string' },
        symmetry: { type: 'string' },
        avoid_regions: { type: 'array', items: { type: 'string' } },
        preserve_regions: { type: 'array', items: { type: 'string' } },
        placement_confidence: { type: 'number' },
      },
    },
    priority_details: { type: 'array', items: { type: 'string' } },
    uncertain_fields: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'provider',
    'confidence',
    'category',
    'garment_type',
    'sleeve_length',
    'garment_length',
    'main_colors',
    'pattern_type',
    'material_appearance',
    'surface_texture',
    'fabric_structure',
    'finish',
    'body_region_to_replace',
    'tryon_prompt_hint',
  ],
};


const UNIVERSAL_BASE =
  'Preserve face, identity, body shape, pose, skin tone, lighting, camera angle, and background. Only change the selected garment region.';
const REFERENCE_TRUTH =
  'The reference image is the source of truth. Preserve visible garment details, proportions, hem, cuffs, neckline, pattern placement, material appearance, and silhouette. Do not simplify, redesign, or invent a different garment. If any description above conflicts with the reference image, follow the reference image.';

const FINAL_PROMPT_MAX = 1200;
const FINAL_PROMPT_SOFT = 900;

function cleanTextureValue(v: any): string {
  if (v === undefined || v === null) return '';
  const s = String(v).trim().toLowerCase();
  if (!s || s === 'unknown' || s === 'n/a' || s === 'none') return '';
  return s;
}

// Preserve original casing (e.g. "AF1", "NYC"). Trim only.
function cleanDetailValue(v: any): string {
  if (v === undefined || v === null) return '';
  const s = String(v).trim();
  if (!s) return '';
  const low = s.toLowerCase();
  if (low === 'unknown' || low === 'n/a' || low === 'none') return '';
  return s;
}

function dedupCaseInsensitive(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of arr) {
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}

function buildTextureSentence(g: any): string {
  const ft = g?.fabric_texture_profile ?? {};
  const tex = cleanTextureValue(ft.surface_texture ?? g?.surface_texture);
  const mat = cleanTextureValue(ft.material_appearance ?? g?.material_appearance);
  const struct = cleanTextureValue(ft.fabric_structure ?? g?.fabric_structure);
  const fin = cleanTextureValue(ft.finish ?? g?.finish);
  const weight = cleanTextureValue(ft.fabric_weight ?? g?.fabric_weight);
  const opacity = cleanTextureValue(ft.opacity ?? g?.opacity);
  const rawDetails = Array.isArray(ft.construction_details)
    ? ft.construction_details
    : (Array.isArray(g?.construction_details) ? g.construction_details : []);
  const details = rawDetails.map(cleanTextureValue).filter(Boolean).slice(0, 4);

  const parts: string[] = [];
  if (tex && mat) parts.push(`${tex} ${mat} texture`);
  else if (mat) parts.push(`${mat} texture`);
  else if (tex) parts.push(`${tex} texture`);
  if (struct) parts.push(`${struct} fabric structure`);
  if (weight) parts.push(`${weight} fabric weight`);
  if (opacity) parts.push(`${opacity} opacity`);
  if (fin) parts.push(`${fin} surface finish`);
  if (details.length) parts.push(`with ${details.join(', ')}`);

  if (!parts.length) return '';
  return `Preserve the ${parts.join(', ')}.`;
}

function buildColorSentence(g: any): string {
  const cp = g?.color_profile;
  if (!cp || typeof cp !== 'object') return '';
  if (typeof cp.color_confidence === 'number' && cp.color_confidence < 0.5) return '';

  const base = cleanTextureValue(cp.base_color);
  const accentsRaw = [
    ...(Array.isArray(cp.primary_colors) ? cp.primary_colors : []),
    ...(Array.isArray(cp.accent_colors) ? cp.accent_colors : []),
    ...(Array.isArray(cp.pattern_colors) ? cp.pattern_colors : []),
    ...(Array.isArray(cp.trim_colors) ? cp.trim_colors : []),
  ].map(cleanTextureValue).filter(Boolean);
  const accents = dedupCaseInsensitive(accentsRaw).filter((c) => c !== base).slice(0, 4);
  const distribution = cleanTextureValue(cp.color_distribution);

  const clauses: string[] = [];
  if (base) clauses.push(`${base} base color`);
  if (accents.length) clauses.push(`${accents.join(', ')} accents`);
  if (distribution) clauses.push(`${distribution} color distribution`);
  if (!clauses.length) return '';
  return `Preserve the ${clauses.join(', ')}.`;
}

function buildPlacementSentence(g: any): string {
  const dp = g?.design_placement_profile;
  if (!dp || typeof dp !== 'object') return '';
  if (typeof dp.placement_confidence === 'number' && dp.placement_confidence < 0.5) return '';

  const loc = cleanTextureValue(dp.main_design_location);
  const dist = cleanTextureValue(dp.pattern_distribution);
  const scale = cleanTextureValue(dp.design_scale);
  const sym = cleanTextureValue(dp.symmetry);
  const preserve = (Array.isArray(dp.preserve_regions) ? dp.preserve_regions : [])
    .map(cleanTextureValue).filter(Boolean).slice(0, 4);
  const avoid = (Array.isArray(dp.avoid_regions) ? dp.avoid_regions : [])
    .map(cleanTextureValue).filter(Boolean).slice(0, 4);

  const sentences: string[] = [];
  if (loc || scale || dist || sym) {
    const modifiers = [scale, loc].filter(Boolean).join(' ');
    const qualifiers = [dist, sym].filter(Boolean).join(', ');
    let s = 'Keep the';
    if (modifiers) s += ` ${modifiers} design`;
    else s += ' design placement';
    if (qualifiers) s += ` (${qualifiers})`;
    s += '.';
    sentences.push(s);
  }
  if (preserve.length) sentences.push(`Preserve ${preserve.join(', ')}.`);
  if (avoid.length) sentences.push(`Avoid altering ${avoid.join(', ')}.`);
  return sentences.join(' ');
}

function buildPriorityDetailsSentence(g: any): string {
  const raw = Array.isArray(g?.priority_details) ? g.priority_details : [];
  const cleaned = raw.map(cleanDetailValue).filter(Boolean);
  const deduped = dedupCaseInsensitive(cleaned).slice(0, 6);
  if (!deduped.length) return '';
  return `Highest-priority details to preserve: ${deduped.join('; ')}.`;
}

function composeFinalPromptHint(g: any): string {
  const region = (g?.body_region_to_replace || 'garment region').toString();
  const detail = (g?.tryon_prompt_hint || '').toString().trim();
  const regionSentence = `Replace only the ${region}.`;
  const color = buildColorSentence(g);
  const texture = buildTextureSentence(g);
  const placement = buildPlacementSentence(g);
  const priority = buildPriorityDetailsSentence(g);

  // Strip duplicate "reference image is the source of truth" / region phrasing
  // from Gemini's tryon_prompt_hint to avoid repeating wording already in
  // UNIVERSAL_BASE / REFERENCE_TRUTH / regionSentence.
  const dedupedDetail = detail
    .replace(/the reference image is the source of truth\.?/gi, '')
    .replace(/replace only the [^.]*\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const full = [
    UNIVERSAL_BASE,
    regionSentence,
    dedupedDetail,
    color,
    texture,
    placement,
    priority,
    REFERENCE_TRUTH,
  ].filter(Boolean).join(' ');

  if (full.length <= FINAL_PROMPT_MAX) return full;

  // Over budget: prioritize body region, gemini hint, placement, top-3 priority, reference truth.
  const topPriority = (() => {
    const raw = Array.isArray(g?.priority_details) ? g.priority_details : [];
    const cleaned = raw.map(cleanDetailValue).filter(Boolean);
    const deduped = dedupCaseInsensitive(cleaned).slice(0, 3);
    return deduped.length ? `Highest-priority details to preserve: ${deduped.join('; ')}.` : '';
  })();

  const trimmed = [
    UNIVERSAL_BASE,
    regionSentence,
    dedupedDetail,
    placement,
    topPriority,
    REFERENCE_TRUTH,
  ].filter(Boolean).join(' ');

  if (trimmed.length <= FINAL_PROMPT_MAX) return trimmed;

  // Still too long: hard truncate at soft budget on a sentence boundary.
  const cap = trimmed.slice(0, FINAL_PROMPT_SOFT);
  const lastPeriod = cap.lastIndexOf('.');
  const base = lastPeriod > 200 ? cap.slice(0, lastPeriod + 1) : cap;
  return `${base} ${REFERENCE_TRUTH}`.trim();
}


async function upsertAnalysis(row: Record<string, unknown>) {
  const { error } = await admin
    .from('wardrobe_garment_analysis')
    .upsert(row, { onConflict: 'wardrobe_item_id' });
  if (error) console.error('[gemini] upsert error', error.message);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const { wardrobe_item_id, force = false } = body;
    if (!wardrobe_item_id) {
      return new Response(JSON.stringify({ error: 'wardrobe_item_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: item, error: itemErr } = await admin
      .from('wardrobe_items')
      .select('id, user_id, image_url, image_bg_removed_url, category, brand')
      .eq('id', wardrobe_item_id)
      .maybeSingle();
    if (itemErr || !item) {
      return new Response(JSON.stringify({ error: 'item not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authMode = await authorize(req, item.user_id);
    if (authMode === 'none') {
      return new Response(JSON.stringify({
        error: 'unauthorized',
        authMode,
        geminiApiConfigured: !!GEMINI_API_KEY,
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rawUrl = item.image_bg_removed_url || item.image_url;
    if (!rawUrl) {
      return new Response(JSON.stringify({ error: 'item has no image' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalized = normalizeUrlForHash(rawUrl);
    const imageHash = await sha256Hex(normalized);

    // Load this row (if any) + any other row with same image_hash that already has Gemini.
    const { data: existing } = await admin
      .from('wardrobe_garment_analysis')
      .select('wardrobe_item_id, gemini_status, gemini_metadata, prompt_hint, status, image_hash')
      .eq('wardrobe_item_id', wardrobe_item_id)
      .maybeSingle();

    if (
      !force &&
      existing?.gemini_status === 'complete' &&
      existing.image_hash === imageHash &&
      existing.gemini_metadata
    ) {
      return new Response(JSON.stringify({ status: 'cached', source: 'self', authMode, geminiApiConfigured: !!GEMINI_API_KEY, geminiStatus: 'complete' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cross-row dedup: another row with the same image already analyzed by Gemini?
    if (!force) {
      const { data: twins } = await admin
        .from('wardrobe_garment_analysis')
        .select('gemini_metadata, prompt_hint, confidence')
        .eq('image_hash', imageHash)
        .eq('gemini_status', 'complete')
        .not('gemini_metadata', 'is', null)
        .limit(1);
      const twin = (twins ?? [])[0] as any;
      if (twin?.gemini_metadata) {
        const promptHint = (twin.prompt_hint && String(twin.prompt_hint).trim())
          ? twin.prompt_hint
          : composeFinalPromptHint(twin.gemini_metadata);
        await upsertAnalysis({
          wardrobe_item_id,
          user_id: item.user_id,
          status: 'complete',
          source_image_url: rawUrl,
          image_hash: imageHash,
          metadata: twin.gemini_metadata,
          prompt_hint: promptHint,
          confidence: twin.confidence ?? null,
          model_name: GEMINI_MODEL,
          analysis_version: ANALYSIS_VERSION,
          error: null,
          gemini_metadata: twin.gemini_metadata,
          gemini_status: 'complete',
          gemini_error: null,
          gemini_version: GEMINI_VERSION,
          primary_provider: 'gemini',
          final_metadata: twin.gemini_metadata,
          final_prompt_hint: promptHint,
        });
        return new Response(JSON.stringify({ status: 'fanout', source: 'twin', authMode, geminiApiConfigured: !!GEMINI_API_KEY, geminiStatus: 'complete' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (!GEMINI_API_KEY) {
      await upsertAnalysis({
        wardrobe_item_id,
        user_id: item.user_id,
        source_image_url: rawUrl,
        image_hash: imageHash,
        gemini_status: 'skipped',
        gemini_error: 'no_api_key',
        gemini_version: GEMINI_VERSION,
      });
      return new Response(JSON.stringify({ status: 'skipped', reason: 'no_api_key', authMode, geminiApiConfigured: false, geminiStatus: 'skipped', geminiError: 'no_api_key' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mark pending.
    await upsertAnalysis({
      wardrobe_item_id,
      user_id: item.user_id,
      source_image_url: rawUrl,
      image_hash: imageHash,
      gemini_status: 'pending',
      gemini_error: null,
      gemini_version: GEMINI_VERSION,
    });

    // Fetch image bytes server-side.
    let imageB64 = '';
    let mimeType = 'image/jpeg';
    try {
      const imgResp = await fetch(rawUrl);
      if (!imgResp.ok) throw new Error(`image_fetch_${imgResp.status}`);
      const ct = imgResp.headers.get('content-type');
      if (ct && /^image\//i.test(ct)) mimeType = ct.split(';')[0].trim();
      const buf = new Uint8Array(await imgResp.arrayBuffer());
      // base64 encode safely.
      let bin = '';
      const chunk = 0x8000;
      for (let i = 0; i < buf.length; i += chunk) {
        bin += String.fromCharCode(...buf.subarray(i, i + chunk));
      }
      imageB64 = btoa(bin);
    } catch (e: any) {
      const reason = (e?.message || 'image_fetch_failed').toString().slice(0, 80);
      await upsertAnalysis({
        wardrobe_item_id,
        user_id: item.user_id,
        source_image_url: rawUrl,
        image_hash: imageHash,
        gemini_status: 'failed',
        gemini_error: reason,
        gemini_version: GEMINI_VERSION,
      });
      return new Response(JSON.stringify({ status: 'failed', reason, authMode, geminiApiConfigured: !!GEMINI_API_KEY, geminiStatus: 'failed', geminiError: reason }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call Gemini.
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
    let raw = '';
    let gemini: any = null;
    let httpStatus = 0;
    const startedAt = Date.now();
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [
                { text: GEMINI_PROMPT },
                { inline_data: { mime_type: mimeType, data: imageB64 } },
              ],
            }],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: RESPONSE_SCHEMA,
            },
          }),
        },
      );
      httpStatus = resp.status;
      raw = await resp.text();
      if (!resp.ok) throw new Error(`gemini_${resp.status}`);
      const parsed = JSON.parse(raw);
      const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('gemini_no_text');
      gemini = JSON.parse(text);
      if (!gemini || typeof gemini !== 'object') throw new Error('gemini_invalid_json');
      gemini.provider = 'gemini';
    } catch (e: any) {
      clearTimeout(to);
      const reason = (e?.name === 'AbortError' ? 'gemini_timeout' : (e?.message || 'gemini_failed')).toString().slice(0, 120);
      const safeSummary = raw.replace(/\s+/g, ' ').slice(0, 240);
      await upsertAnalysis({
        wardrobe_item_id,
        user_id: item.user_id,
        source_image_url: rawUrl,
        image_hash: imageHash,
        gemini_status: 'failed',
        gemini_error: reason,
        gemini_version: GEMINI_VERSION,
      });
      console.log('[gemini] failed', { wardrobe_item_id, reason, httpStatus, durationMs: Date.now() - startedAt, safeSummary });
      return new Response(JSON.stringify({ status: 'failed', reason, httpStatus, authMode, geminiApiConfigured: !!GEMINI_API_KEY, geminiStatus: 'failed', geminiError: reason }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    clearTimeout(to);

    // Gemini-only mode: write result directly into the canonical prompt_hint/status/metadata
    // columns so Live Cam reads it transparently. FashionCLIP merge layer disabled while testing.
    const promptHint = composeFinalPromptHint(gemini);
    const conf = typeof gemini?.confidence === 'number' ? gemini.confidence : null;

    await upsertAnalysis({
      wardrobe_item_id,
      user_id: item.user_id,
      source_image_url: rawUrl,
      image_hash: imageHash,
      status: 'complete',
      metadata: gemini,
      prompt_hint: promptHint,
      confidence: conf,
      model_name: GEMINI_MODEL,
      analysis_version: ANALYSIS_VERSION,
      error: null,
      gemini_metadata: gemini,
      gemini_status: 'complete',
      gemini_error: null,
      gemini_version: GEMINI_VERSION,
      primary_provider: 'gemini',
      final_metadata: gemini,
      final_prompt_hint: promptHint,
    });

    console.log('[gemini] complete', {
      wardrobe_item_id,
      durationMs: Date.now() - startedAt,
      category: gemini.category,
      confidence: gemini.confidence,
      hintLen: (gemini.tryon_prompt_hint || '').length,
    });

    return new Response(JSON.stringify({ status: 'complete', category: gemini.category, httpStatus, authMode, geminiApiConfigured: true, geminiStatus: 'complete' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[gemini] unhandled', error?.message);
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
