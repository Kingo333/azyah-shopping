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

The reference image is the source of truth.

The tryon_prompt_hint must tell FluxRT exactly what to preserve from the reference image.

Do not invent a different garment.
Do not add unrelated styling.
Do not change category if uncertain.

If the garment has a visible graphic, logo, text, embroidery, border, trim, stripe, floral print, or other design detail, identify its simple placement using detail_location, detail_type, detail_scale, detail_orientation, and detail_confidence. Use "unknown" when uncertain. The reference image remains the source of truth.`;

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
    detail_location: { type: 'string' },
    detail_type: { type: 'string' },
    detail_scale: { type: 'string' },
    detail_orientation: { type: 'string' },
    detail_confidence: { type: 'number' },
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
  'The reference image is the source of truth. If any text description conflicts with the reference image, follow the reference image.';

function cleanTextureValue(v: any): string {
  if (v === undefined || v === null) return '';
  const s = String(v).trim().toLowerCase();
  if (!s || s === 'unknown' || s === 'n/a' || s === 'none') return '';
  return s;
}

function buildTextureSentence(g: any): string {
  const tex = cleanTextureValue(g?.surface_texture);
  const mat = cleanTextureValue(g?.material_appearance);
  const struct = cleanTextureValue(g?.fabric_structure);
  const fin = cleanTextureValue(g?.finish);
  const weight = cleanTextureValue(g?.fabric_weight);
  const opacity = cleanTextureValue(g?.opacity);
  const details = Array.isArray(g?.construction_details)
    ? g.construction_details.map(cleanTextureValue).filter(Boolean).slice(0, 4)
    : [];

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

function isMeaningful(v: any, blocked: string[] = []): boolean {
  const s = cleanTextureValue(v);
  if (!s) return false;
  return !blocked.includes(s);
}

function meaningfulArray(v: any, blocked: string[] = []): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => cleanTextureValue(x)).filter((s) => s && !blocked.includes(s));
}

// Compact, single-sentence guidance — only for detailed garments. ≤250 chars.
// Returns either the sentence or '' (with a reason captured on the helper-owned ref via console).
function buildCompactDetailBooster(g: any, existingHint: string): { sentence: string; skipReason: string } {
  const pattern = cleanTextureValue(g?.pattern_type);
  const patternPlacement = cleanTextureValue(g?.pattern_placement);
  const tex = cleanTextureValue(g?.surface_texture);
  const mat = cleanTextureValue(g?.material_appearance);
  const accents = meaningfulArray(g?.accent_colors);
  const visualDetails = meaningfulArray(g?.important_visual_details);
  const construction = meaningfulArray(g?.construction_details);
  const mains = meaningfulArray(g?.main_colors);
  const sleeves = cleanTextureValue(g?.sleeve_length);
  const neckline = cleanTextureValue(g?.neckline_or_collar);
  const logoOrText = g?.logo_or_text === true;

  const plainPatterns = ['solid', 'plain', 'none'];
  const blandTexture = ['smooth'];

  const isDetailed =
    (pattern && !plainPatterns.includes(pattern)) ||
    visualDetails.length > 0 ||
    (tex && !blandTexture.includes(tex)) ||
    construction.length > 0 ||
    accents.length > 0 ||
    !!patternPlacement ||
    logoOrText;

  if (!isDetailed) return { sentence: '', skipReason: 'plain_or_unknown' };

  // Build compact sentence — only include parts that are meaningful.
  const segs: string[] = [];
  const placementBit = [patternPlacement, pattern].filter(Boolean).join(' ').trim();
  if (placementBit) segs.push(`${placementBit} placement`);
  if (mains.length) segs.push(`${mains.slice(0, 2).join(' and ')} base color`);
  if (accents.length) segs.push(`${accents.slice(0, 2).join(' and ')} accents`);
  if (sleeves && sleeves !== 'unknown') segs.push(sleeves.replace(/_/g, ' '));
  if (neckline && neckline !== 'unknown') segs.push(`${neckline} neckline`);
  const textureBit = [tex, mat].filter(Boolean).join(' ').trim();
  if (textureBit) segs.push(`${textureBit} texture`);
  if (visualDetails.length) segs.push(visualDetails.slice(0, 2).join(' and '));

  if (segs.length === 0) return { sentence: '', skipReason: 'no_useful_fields' };

  let sentence = `Preserve the ${segs.join(', ')}. Keep details on the garment and follow the reference image.`;
  if (sentence.length > 250) {
    sentence = sentence.slice(0, 247);
    const lastSpace = sentence.lastIndexOf(' ');
    if (lastSpace > 200) sentence = sentence.slice(0, lastSpace);
    sentence += '.';
  }

  // Duplication guard — if the existing hint already says "preserve" with same first color, skip.
  const lowerHint = (existingHint || '').toLowerCase();
  if (mains[0] && lowerHint.includes('preserve') && lowerHint.includes(mains[0])) {
    return { sentence: '', skipReason: 'duplicate_of_hint' };
  }

  return { sentence, skipReason: '' };
}

function composeFinalPromptHint(g: any, debugCtx?: { wardrobe_item_id?: string }): string {
  const region = (g?.body_region_to_replace || 'garment region').toString();
  const detail = (g?.tryon_prompt_hint || '').toString().trim();
  const texture = buildTextureSentence(g);
  const { sentence: booster, skipReason } = buildCompactDetailBooster(g, detail);

  const withBooster = [
    UNIVERSAL_BASE,
    `Replace only the ${region}.`,
    detail,
    texture,
    booster,
    REFERENCE_TRUTH,
  ].filter(Boolean).join(' ');

  let finalHint = withBooster;
  let boosterAdded = !!booster;
  let lengthSkipReason = skipReason;

  // Length guard — drop booster first if over 700 chars.
  if (finalHint.length > 700 && boosterAdded) {
    finalHint = [
      UNIVERSAL_BASE,
      `Replace only the ${region}.`,
      detail,
      texture,
      REFERENCE_TRUTH,
    ].filter(Boolean).join(' ');
    boosterAdded = false;
    lengthSkipReason = 'length_guard_dropped';
  }

  console.log('[gemini] composed', {
    wardrobe_item_id: debugCtx?.wardrobe_item_id ?? null,
    hintLen: finalHint.length,
    boosterAdded,
    boosterSkipReason: lengthSkipReason,
  });

  return finalHint;
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
          : composeFinalPromptHint(twin.gemini_metadata, { wardrobe_item_id });
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
    const promptHint = composeFinalPromptHint(gemini, { wardrobe_item_id });
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
