// Live Cam: start a FluxRT session via the Worker orchestrator.
// Auth required. Resolves user_id from JWT; ignores any client-sent user_id.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

interface StartBody {
  garment_id: string;
  garment_source: 'product' | 'event_brand_product' | 'wardrobe_item';
}

const ALLOWED_SOURCES = new Set(['product', 'event_brand_product', 'wardrobe_item']);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return json({ error: 'Unauthorized' }, 401);
    }
    const userId = userData.user.id;

    const body = (await req.json().catch(() => null)) as StartBody | null;
    if (!body || typeof body.garment_id !== 'string' || !body.garment_id || !ALLOWED_SOURCES.has(body.garment_source)) {
      return json({ error: 'Invalid payload' }, 400);
    }

    // Read-only access check using caller JWT — existing RLS enforces access.
    const sourceTable =
      body.garment_source === 'product'
        ? 'products'
        : body.garment_source === 'event_brand_product'
          ? 'event_brand_products'
          : 'wardrobe_items';

    const { data: garmentRow, error: garmentErr } = await supabase
      .from(sourceTable)
      .select('id')
      .eq('id', body.garment_id)
      .maybeSingle();

    if (garmentErr || !garmentRow) {
      return json({ error: 'Garment not accessible' }, 403);
    }

    // Insert session row as the caller (RLS-protected).
    const { data: session, error: insertErr } = await supabase
      .from('live_cam_sessions')
      .insert({
        user_id: userId,
        garment_id: body.garment_id,
        garment_source: body.garment_source,
        status: 'starting',
      })
      .select('id')
      .single();

    if (insertErr || !session) {
      return json({ error: 'Failed to create session', detail: insertErr?.message }, 500);
    }

    const orchestratorUrl = Deno.env.get('ORCHESTRATOR_URL');
    const orchestratorKey = Deno.env.get('ORCHESTRATOR_API_KEY');
    if (!orchestratorUrl || !orchestratorKey) {
      await supabase
        .from('live_cam_sessions')
        .update({ status: 'failed', error_message: 'Orchestrator not configured', ended_at: new Date().toISOString() })
        .eq('id', session.id);
      return json({ error: 'Orchestrator not configured' }, 500);
    }

    let podId: string | null = null;
    let wsUrl: string | null = null;
    let gpuUsed: string | null = null;
    let cloudUsed: string | null = null;
    let attempts: unknown = null;
    try {
      const upstream = await fetch(`${orchestratorUrl.replace(/\/$/, '')}/sessions/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${orchestratorKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId, garment_id: body.garment_id }),
      });
      const text = await upstream.text();
      let parsed: any = null;
      try { parsed = JSON.parse(text); } catch { /* keep raw */ }

      if (!upstream.ok || !parsed?.ok) {
        const errCode = parsed?.error as string | undefined;
        const upstreamAttempts = parsed?.attempts ?? null;
        await supabase
          .from('live_cam_sessions')
          .update({
            status: 'failed',
            error_message: `${errCode ?? 'worker_error'} (${upstream.status}): ${text.slice(0, 500)}`,
            attempts: upstreamAttempts,
            ended_at: new Date().toISOString(),
          })
          .eq('id', session.id);

        if (errCode === 'runpod_no_capacity') {
          return json({
            error: 'All GPUs are temporarily unavailable, please try again in a minute.',
            code: 'runpod_no_capacity',
            attempts: upstreamAttempts,
          }, 503);
        }
        if (errCode === 'runpod_create_failed') {
          console.error('runpod_create_failed', { upstream_status: parsed?.upstream_status, upstream_body: parsed?.upstream_body, attempts: upstreamAttempts });
          return json({
            error: 'Could not start a GPU pod. Please try again shortly.',
            code: 'runpod_create_failed',
            attempts: upstreamAttempts,
          }, 502);
        }
        return json({ error: 'Worker failed', status: upstream.status, body: text.slice(0, 500), attempts: upstreamAttempts }, 502);
      }

      podId = parsed.pod_id as string;
      wsUrl = (parsed.ws_url as string) ?? null;
      gpuUsed = (parsed.gpu_used as string) ?? null;
      cloudUsed = (parsed.cloud_used as string) ?? null;
      attempts = parsed.attempts ?? null;

      if (!wsUrl) {
        await supabase
          .from('live_cam_sessions')
          .update({
            status: 'failed',
            error_message: 'Worker returned no ws_url',
            attempts,
            ended_at: new Date().toISOString(),
          })
          .eq('id', session.id);
        return json({ error: 'Worker returned no ws_url', attempts }, 502);
      }
    } catch (e: any) {
      await supabase
        .from('live_cam_sessions')
        .update({ status: 'failed', error_message: `Worker exception: ${e?.message ?? String(e)}`, ended_at: new Date().toISOString() })
        .eq('id', session.id);
      return json({ error: 'Worker exception', message: e?.message ?? String(e) }, 502);
    }

    await supabase
      .from('live_cam_sessions')
      .update({ pod_id: podId, ws_url: wsUrl, status: 'running', gpu_used: gpuUsed, cloud_used: cloudUsed, attempts })
      .eq('id', session.id);


    return json({ session_id: session.id, ws_url: wsUrl, pod_id: podId });
  } catch (e: any) {
    return json({ error: 'Server error', message: e?.message ?? String(e) }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
