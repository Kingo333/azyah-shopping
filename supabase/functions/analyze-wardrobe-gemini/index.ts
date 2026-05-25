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

async function getTriggerSecret(): Promise<string | null> {
  try {
    const { data } = await admin.rpc('get_fashionclip_trigger_secret' as any);
    return (data as any) ?? null;
  } catch {
    return null;
  }
}

async function authorize(req: Request, itemUserId: string): Promise<boolean> {
  const trig = req.headers.get('x-trigger-secret');
  if (trig) {
    const expected = await getTriggerSecret();
    return !!expected && trig === expected;
  }
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return false;
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const { data, error } = await userClient.auth.getClaims(auth.replace('Bearer ', ''));
  if (error || !data?.claims) return false;
  return data.claims.sub === itemUserId;
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
    logo_or_text: { type: 'boolean' },
    visible_text: { type: 'array', items: { type: 'string' } },
    important_visual_details: { type: 'array', items: { type: 'string' } },
    body_region_to_replace: { type: 'string' },
    body_regions_to_preserve: { type: 'array', items: { type: 'string' } },
    tryon_prompt_hint: { type: 'string' },
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
    'body_region_to_replace',
    'tryon_prompt_hint',
  ],
};

const UNIVERSAL_BASE =
  'Preserve face, identity, body shape, pose, skin tone, lighting, camera angle, and background. Only change the selected garment region.';
const REFERENCE_TRUTH =
  'The reference image is the source of truth. Preserve visible garment details, proportions, hem, cuffs, neckline, pattern placement, material appearance, and silhouette. Do not simplify, redesign, or invent a different garment.';

function composeFinalPromptHint(g: any): string {
  const region = (g?.body_region_to_replace || 'garment region').toString();
  const detail = (g?.tryon_prompt_hint || '').toString().trim();
  const parts = [
    UNIVERSAL_BASE,
    `Replace only the ${region}.`,
    detail,
    REFERENCE_TRUTH,
  ];
  return parts.filter(Boolean).join(' ');
}

function geminiLooksLow(g: any): boolean {
  if (!g) return true;
  const conf = typeof g.confidence === 'number' ? g.confidence : 0;
  const unknownish = (v: any) => !v || String(v).toLowerCase() === 'unknown';
  return (
    conf < 0.35 ||
    (unknownish(g.category) && unknownish(g.garment_type)) ||
    (unknownish(g.sleeve_length) && unknownish(g.pattern_type))
  );
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

    const ok = await authorize(req, item.user_id);
    if (!ok) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
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
      return new Response(JSON.stringify({ status: 'cached', source: 'self' }), {
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
        });
        return new Response(JSON.stringify({ status: 'fanout', source: 'twin' }), {
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
      return new Response(JSON.stringify({ status: 'skipped', reason: 'no_api_key' }), {
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
      return new Response(JSON.stringify({ status: 'failed', reason }), {
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
      return new Response(JSON.stringify({ status: 'failed', reason, httpStatus }), {
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
    });

    console.log('[gemini] complete', {
      wardrobe_item_id,
      durationMs: Date.now() - startedAt,
      category: gemini.category,
      confidence: gemini.confidence,
      hintLen: (gemini.tryon_prompt_hint || '').length,
    });

    return new Response(JSON.stringify({ status: 'complete', category: gemini.category }), {
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
