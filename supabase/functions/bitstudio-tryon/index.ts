import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BITSTUDIO_API_KEY = Deno.env.get('BITSTUDIO_API_KEY');
const BITSTUDIO_BASE = 'https://api.bitstudio.ai';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = req.headers.get('Authorization');
  if (!auth) return json(401, { error: 'Missing auth' });

  // Separate clients: userClient for auth, adminClient for DB operations
  const userClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
    global: { headers: { Authorization: auth } }
  });
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const { jobId, idempotencyKey } = await req.json();

    if (!jobId) return json(400, { error: 'jobId required' });
    if (!BITSTUDIO_API_KEY) {
      console.error('[BitStudio-Tryon] BITSTUDIO_API_KEY not configured');
      return json(500, { error: 'BitStudio API key not configured' });
    }

    console.log('[BitStudio-Tryon] Processing job:', jobId);

    // 1) Load job, person, product
    const { data: job, error: jErr } = await adminClient
      .from('event_tryon_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jErr || !job) {
      console.error('[BitStudio-Tryon] Job not found:', jobId, jErr);
      return json(404, { error: 'Job not found', details: jErr });
    }

    const [{ data: person }, { data: product }] = await Promise.all([
      adminClient
        .from('event_user_photos')
        .select('bitstudio_image_id, photo_url')
        .eq('event_id', job.event_id)
        .eq('user_id', job.user_id)
        .single(),
      adminClient
        .from('event_brand_products')
        .select('try_on_provider, try_on_config, try_on_data, image_url')
        .eq('id', job.product_id)
        .single()
    ]);

    // Owner check
    const { data: me } = await userClient.auth.getUser();
    if (!me?.user || me.user.id !== job.user_id) {
      console.error('[BitStudio-Tryon] Forbidden - user mismatch');
      return json(403, { error: 'Forbidden' });
    }

    // Preconditions
    const personId = person?.bitstudio_image_id;
    if (!personId) {
      console.error('[BitStudio-Tryon] Missing person bitstudio_image_id');
      await adminClient
        .from('event_tryon_jobs')
        .update({
          status: 'failed',
          error: 'Missing person bitstudio_image_id. Upload person photo first.'
        })
        .eq('id', jobId);
      return json(422, { error: 'Missing person_image_id' });
    }

    // Priority: try_on_data > try_on_config > product.image_url
    const tryOnData = product?.try_on_data ?? {};
    const cfg = product?.try_on_config ?? {};
    const outfitId = tryOnData?.outfit_bitstudio_id || cfg?.outfit_image_id;
    const outfitUrl = tryOnData?.outfit_image_url || cfg?.outfit_image_url || product?.image_url;
    
    console.log('[BitStudio-Tryon] Using outfit:', {
      bitstudio_id: outfitId,
      image_url: outfitUrl ? 'present' : 'missing',
      source: outfitId ? (tryOnData?.outfit_bitstudio_id ? 'try_on_data' : 'try_on_config') : 'product.image_url'
    });

    if (!outfitId && !outfitUrl) {
      console.error('[BitStudio-Tryon] Missing outfit reference - product:', product);
      await adminClient
        .from('event_tryon_jobs')
        .update({
          status: 'failed',
          error: 'Product is not configured for try-on yet. Retailer needs to set up try-on images.'
        })
        .eq('id', jobId);
      return json(422, { error: 'Product not configured for try-on' });
    }

    // idempotency to prevent duplicate jobs
    const idem = idempotencyKey ?? `vto:${jobId}`;

    // 2) Call BitStudio VTO
    const payload: Record<string, unknown> = {
      person_image_id: personId,
      resolution: 'standard',
      num_images: 1
    };

    if (outfitId) {
      payload['outfit_image_id'] = outfitId;
    } else if (outfitUrl) {
      payload['outfit_image_url'] = outfitUrl;
    }

    console.log('[BitStudio-Tryon] Calling BitStudio API with:', {
      person_image_id: personId,
      outfit_image_id: outfitId,
      outfit_image_url: outfitUrl ? 'present' : 'missing'
    });

    const tryRes = await fetch(`${BITSTUDIO_BASE}/images/virtual-try-on`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BITSTUDIO_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idem
      },
      body: JSON.stringify(payload)
    });

    const raw = await tryRes.text();
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error('[BitStudio-Tryon] Failed to parse response:', raw);
    }

    console.log('[BitStudio-Tryon] BitStudio HTTP status:', tryRes.status);
    console.log('[BitStudio-Tryon] BitStudio response:', parsed ?? raw);

    // 3) Robust response parsing: array or object
    const providerJobId =
      (Array.isArray(parsed) && parsed[0]?.id) ||
      parsed?.id ||
      parsed?.data?.[0]?.id ||
      null;

    if (!tryRes.ok || !providerJobId) {
      console.error('[BitStudio-Tryon] Failed to get provider_job_id');
      await adminClient
        .from('event_tryon_jobs')
        .update({
          status: 'failed',
          provider_status: parsed?.status ?? null,
          provider_raw: safeJson(parsed ?? raw),
          error: !tryRes.ok
            ? parsed?.error?.message ?? `BitStudio ${tryRes.status}`
            : 'Could not parse provider job id'
        })
        .eq('id', jobId);
      return json(500, { error: 'BitStudio VTO failed', details: parsed ?? raw });
    }

    // 4) Persist provider_job_id and set processing
    console.log('[BitStudio-Tryon] Success! provider_job_id:', providerJobId);
    await adminClient
      .from('event_tryon_jobs')
      .update({
        provider: 'bitstudio',
        provider_job_id: providerJobId,
        provider_status: parsed?.status ?? 'pending',
        provider_raw: safeJson(parsed ?? raw),
        status: 'processing'
      })
      .eq('id', jobId);

    return json(200, { ok: true, provider_job_id: providerJobId });
  } catch (e) {
    console.error('[BitStudio-Tryon] Catch block error:', e);
    return json(500, { error: String(e) });
  }
});

function safeJson(x: any) {
  try {
    return typeof x === 'string' ? JSON.parse(x) : x;
  } catch {
    return { raw: String(x) };
  }
}