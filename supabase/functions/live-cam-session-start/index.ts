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
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return json({ error: 'Unauthorized' }, 401);
    }
    const userId = claimsData.claims.sub as string;

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
    try {
      const upstream = await fetch(`${orchestratorUrl.replace(/\/$/, '')}/session/start`, {
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
        await supabase
          .from('live_cam_sessions')
          .update({
            status: 'failed',
            error_message: `Worker error ${upstream.status}: ${text.slice(0, 500)}`,
            ended_at: new Date().toISOString(),
          })
          .eq('id', session.id);
        return json({ error: 'Worker failed', status: upstream.status, body: text.slice(0, 500) }, 502);
      }

      podId = parsed.pod_id as string;
      wsUrl = (parsed.ws_url_hint as string) ?? (podId ? `wss://${podId}-8765.proxy.runpod.net/ws` : null);
    } catch (e: any) {
      await supabase
        .from('live_cam_sessions')
        .update({ status: 'failed', error_message: `Worker exception: ${e?.message ?? String(e)}`, ended_at: new Date().toISOString() })
        .eq('id', session.id);
      return json({ error: 'Worker exception', message: e?.message ?? String(e) }, 502);
    }

    await supabase
      .from('live_cam_sessions')
      .update({ pod_id: podId, ws_url: wsUrl, status: 'running' })
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
