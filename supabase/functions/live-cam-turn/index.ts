// Live Cam WebRTC: hands the app short-lived TURN credentials for one live session.
// Only for a signed-in shopper (JWT) with a live session of their own that is starting or running
// (body: { session_id }). The relay is set with Supabase Edge Function secrets only (see turn.ts):
//   Cloudflare Realtime TURN: CF_TURN_KEY_ID, CF_TURN_API_TOKEN   (the owner's choice)
//   self-hosted coturn:       TURN_URLS, TURN_SHARED_SECRET        (kept as an option)
//   TURN_PROVIDER (optional, cloudflare | coturn), TURN_TTL_SECONDS (optional, default 3600)
// No secrets set = WebRTC off: no servers, and the app stays on WebSocket JPEG.
// The app calls this only when it is about to try WebRTC, and passes the servers to the GPU worker in
// its webrtc_offer, so the worker never holds a TURN secret.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { iceServersFor, liveSessionAllowsTurn, readTurnConfig, userTag, type LiveSessionRow } from './turn.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (userErr || !userData?.user?.id) return json({ error: 'Unauthorized' }, 401);
  const userId = userData.user.id;

  const body = (await req.json().catch(() => null)) as { session_id?: unknown } | null;
  const sessionId = typeof body?.session_id === 'string' ? body.session_id : '';
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return json({ error: 'session_id required' }, 400);
  // The shopper's own row (row-level security lets an owner read it).
  const { data: row } = await supabase
    .from('live_cam_sessions')
    .select('user_id, status, started_at, ended_at')
    .eq('id', sessionId)
    .maybeSingle();
  if (!liveSessionAllowsTurn(row as LiveSessionRow | null, userId, Date.now())) return json({ error: 'no_live_session' }, 403);

  const cfg = readTurnConfig((name) => Deno.env.get(name) ?? undefined);
  if (cfg.provider === 'none') {
    console.log(`[live-cam-turn] off: ${cfg.reason ?? 'not configured'}`);
    return json({ provider: 'none', ice_servers: [], ttl: 0 });
  }
  try {
    const out = await iceServersFor(cfg, await userTag(userId), Date.now() / 1000, fetch);
    return json(out);
  } catch (e) {
    // The app treats an empty list as "stay on JPEG"; no secret is in this message.
    console.warn(`[live-cam-turn] ${cfg.provider} failed: ${String((e as Error)?.message ?? e).slice(0, 160)}`);
    return json({ provider: cfg.provider, ice_servers: [], ttl: 0, error: 'turn_unavailable' });
  }
});
