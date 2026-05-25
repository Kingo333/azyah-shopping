// Closet-only FashionCLIP analyzer.
// Called by: (1) DB trigger via x-trigger-secret, (2) authenticated user (manual reanalyze).
// Reads wardrobe_items, calls FashionCLIP worker, upserts wardrobe_garment_analysis.
// Never blocks uploads. Falls back to skipped/failed status if worker is unavailable.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-trigger-secret',
};

const ANALYSIS_VERSION = 'fashionclip-v1';
const MODEL_NAME = 'Marqo/marqo-fashionSigLIP';
const WORKER_TIMEOUT_MS = Number(Deno.env.get('FASHIONCLIP_WORKER_TIMEOUT_MS') ?? '90000') || 90_000;

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const WORKER_URL_RAW = Deno.env.get('FASHIONCLIP_WORKER_URL') ?? '';
const WORKER_TOKEN = Deno.env.get('FASHIONCLIP_WORKER_TOKEN') ?? '';
const RUNPOD_API_KEY = Deno.env.get('RUNPOD_API_KEY') ?? '';

function normalizeWorkerUrl(raw: string): string {
  let v = (raw ?? '').trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim();
  }
  return v.replace(/\/+$/, '');
}
const WORKER_URL = normalizeWorkerUrl(WORKER_URL_RAW);

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

interface Body {
  wardrobe_item_id?: string;
  user_id?: string;
  force?: boolean;
}

async function hashString(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getTriggerSecret(): Promise<string | null> {
  try {
    const { data } = await admin
      .schema('vault' as any)
      .from('decrypted_secrets')
      .select('decrypted_secret')
      .eq('name', 'fashionclip_trigger_secret')
      .maybeSingle();
    return (data as any)?.decrypted_secret ?? null;
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

async function upsertAnalysis(row: Record<string, unknown>) {
  const { error } = await admin
    .from('wardrobe_garment_analysis')
    .upsert(row, { onConflict: 'wardrobe_item_id' });
  if (error) console.error('[fashionclip] upsert error', error.message);
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

    // Load item
    const { data: item, error: itemErr } = await admin
      .from('wardrobe_items')
      .select('id, user_id, image_url, image_bg_removed_url, category, name, brand')
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

    const imageUrl = item.image_bg_removed_url || item.image_url;
    const imageHash = await hashString(imageUrl);

    // Idempotency: skip if cached complete with same hash + version (unless force)
    const { data: existing } = await admin
      .from('wardrobe_garment_analysis')
      .select('status, image_hash, analysis_version')
      .eq('wardrobe_item_id', wardrobe_item_id)
      .maybeSingle();

    if (
      !force &&
      existing?.status === 'complete' &&
      existing.image_hash === imageHash &&
      existing.analysis_version === ANALYSIS_VERSION
    ) {
      console.log('[fashionclip] cached', { wardrobe_item_id, status: 'complete' });
      return new Response(JSON.stringify({ status: 'cached' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mark pending
    await upsertAnalysis({
      wardrobe_item_id,
      user_id: item.user_id,
      status: 'pending',
      source_image_url: imageUrl,
      image_hash: imageHash,
      analysis_version: ANALYSIS_VERSION,
      model_name: MODEL_NAME,
      error: null,
    });

    // Safe worker diagnostics
    let workerHost = '';
    let workerPathShape: 'base' | 'includes_ping' | 'includes_analyze' | 'other_path' = 'base';
    let workerUrlValid = false;
    let workerUrlError: string | null = null;
    try {
      if (!WORKER_URL) throw new Error('empty');
      const u = new URL(WORKER_URL);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('bad_protocol');
      workerHost = u.hostname;
      workerUrlValid = !!workerHost;
      const p = u.pathname.replace(/\/+$/, '');
      if (p === '' || p === '/') workerPathShape = 'base';
      else if (p.endsWith('/ping')) workerPathShape = 'includes_ping';
      else if (p.endsWith('/analyze')) workerPathShape = 'includes_analyze';
      else workerPathShape = 'other_path';
    } catch {
      workerUrlValid = false;
      workerUrlError = 'invalid_absolute_url';
    }
    const workerConfigured = !!WORKER_URL && !!WORKER_TOKEN && workerUrlValid;
    const runpodAuthConfigured = !!RUNPOD_API_KEY;
    console.log('[fashionclip] worker', { workerConfigured, runpodAuthConfigured, workerHost, workerPathShape, workerUrlValid, workerUrlError });

    // No worker configured -> skipped
    if (!workerConfigured || !runpodAuthConfigured) {
      const reason = !workerConfigured ? 'worker_not_configured' : 'runpod_auth_not_configured';
      await upsertAnalysis({
        wardrobe_item_id,
        user_id: item.user_id,
        status: 'skipped',
        source_image_url: imageUrl,
        image_hash: imageHash,
        analysis_version: ANALYSIS_VERSION,
        model_name: MODEL_NAME,
        error: reason,
      });
      console.log('[fashionclip] skipped', { wardrobe_item_id, reason });
      return new Response(JSON.stringify({ status: 'skipped', reason, workerConfigured, runpodAuthConfigured, workerHost, workerPathShape }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call worker
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), WORKER_TIMEOUT_MS);
    let workerResp: Response;
    const startedAt = Date.now();
    try {
      workerResp = await fetch(`${WORKER_URL}/analyze`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RUNPOD_API_KEY}`,
          'X-Worker-Token': WORKER_TOKEN,
        },
        body: JSON.stringify({
          image_url: imageUrl,
          category: item.category ?? null,
          name: item.name ?? null,
          brand: item.brand ?? null,
        }),
      });
    } catch (e: any) {
      clearTimeout(to);
      const durationMs = Date.now() - startedAt;
      const reason = e?.name === 'AbortError' ? 'worker_timeout' : 'worker_unreachable';
      await upsertAnalysis({
        wardrobe_item_id,
        user_id: item.user_id,
        status: 'failed',
        source_image_url: imageUrl,
        image_hash: imageHash,
        analysis_version: ANALYSIS_VERSION,
        model_name: MODEL_NAME,
        error: reason,
      });
      console.log('[fashionclip] failed', { wardrobe_item_id, reason, durationMs, timeoutMs: WORKER_TIMEOUT_MS });
      return new Response(JSON.stringify({ status: 'failed', reason, durationMs, timeoutMs: WORKER_TIMEOUT_MS }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    clearTimeout(to);
    const analyzeDurationMs = Date.now() - startedAt;

    if (!workerResp.ok) {
      const reason = `worker_${workerResp.status}`;
      await upsertAnalysis({
        wardrobe_item_id,
        user_id: item.user_id,
        status: 'failed',
        source_image_url: imageUrl,
        image_hash: imageHash,
        analysis_version: ANALYSIS_VERSION,
        model_name: MODEL_NAME,
        error: reason,
      });
      console.log('[fashionclip] failed', { wardrobe_item_id, reason });
      return new Response(JSON.stringify({ status: 'failed', reason }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await workerResp.json().catch(() => ({} as any));
    const metadata = result?.metadata ?? null;
    const promptHint = typeof result?.prompt_hint === 'string' ? result.prompt_hint : null;
    const confidence =
      typeof result?.confidence === 'number' ? result.confidence : null;

    await upsertAnalysis({
      wardrobe_item_id,
      user_id: item.user_id,
      status: 'complete',
      metadata,
      prompt_hint: promptHint,
      confidence,
      source_image_url: imageUrl,
      image_hash: imageHash,
      analysis_version: ANALYSIS_VERSION,
      model_name: MODEL_NAME,
      error: null,
    });

    console.log('[fashionclip] complete', {
      wardrobe_item_id,
      hasMetadata: !!metadata,
      hasPromptHint: !!promptHint,
      promptLen: promptHint?.length ?? 0,
    });

    return new Response(JSON.stringify({ status: 'complete' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[fashionclip] unhandled', error?.message);
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
