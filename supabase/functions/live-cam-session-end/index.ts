// Live Cam: end a session. Idempotent.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) return json({ error: 'Unauthorized' }, 401);
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => null) as { session_id?: string } | null;
    if (!body?.session_id || typeof body.session_id !== 'string') {
      return json({ error: 'Invalid payload' }, 400);
    }

    const { data: session, error: getErr } = await supabase
      .from('live_cam_sessions')
      .select('id, user_id, pod_id, status')
      .eq('id', body.session_id)
      .maybeSingle();

    if (getErr || !session) return json({ error: 'Session not found' }, 404);
    if (session.user_id !== userId) return json({ error: 'Forbidden' }, 403);

    if (session.status === 'ended') {
      return json({ ok: true, already_ended: true });
    }

    const orchestratorUrl = Deno.env.get('ORCHESTRATOR_URL');
    const orchestratorKey = Deno.env.get('ORCHESTRATOR_API_KEY');

    if (session.pod_id && orchestratorUrl && orchestratorKey) {
      try {
        await fetch(`${orchestratorUrl.replace(/\/$/, '')}/session/end`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${orchestratorKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ pod_id: session.pod_id }),
        });
      } catch (e) {
        // Continue — still mark ended locally.
        console.warn('Worker end call failed', e);
      }
    }

    await supabase
      .from('live_cam_sessions')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', session.id);

    return json({ ok: true });
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
