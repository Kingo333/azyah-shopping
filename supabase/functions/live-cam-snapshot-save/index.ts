// Live Cam: save a snapshot of the remote try-on frame.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg']);

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
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) return json({ error: 'Unauthorized' }, 401);
    const userId = userData.user.id;

    const form = await req.formData().catch(() => null);
    if (!form) return json({ error: 'Invalid form data' }, 400);
    const sessionId = form.get('session_id');
    const image = form.get('image');
    if (typeof sessionId !== 'string' || !sessionId) return json({ error: 'Missing session_id' }, 400);
    if (!(image instanceof File)) return json({ error: 'Missing image file' }, 400);
    if (!ALLOWED_TYPES.has(image.type)) return json({ error: 'Unsupported image type' }, 400);
    if (image.size > MAX_BYTES) return json({ error: 'Image too large' }, 413);

    const { data: session, error: sessionErr } = await supabase
      .from('live_cam_sessions')
      .select('id, user_id, garment_id')
      .eq('id', sessionId)
      .maybeSingle();
    if (sessionErr || !session) return json({ error: 'Session not found' }, 404);
    if (session.user_id !== userId) return json({ error: 'Forbidden' }, 403);

    const ext = image.type === 'image/png' ? 'png' : 'jpg';
    const path = `${userId}/${sessionId}/${Date.now()}.${ext}`;
    const bytes = new Uint8Array(await image.arrayBuffer());

    const { error: uploadErr } = await supabase.storage
      .from('live-cam-snapshots')
      .upload(path, bytes, { contentType: image.type, upsert: false });
    if (uploadErr) return json({ error: 'Upload failed', detail: uploadErr.message }, 500);

    const { data: row, error: insertErr } = await supabase
      .from('live_cam_snapshots')
      .insert({
        session_id: sessionId,
        user_id: userId,
        garment_id: session.garment_id,
        storage_path: path,
      })
      .select('id')
      .single();
    if (insertErr || !row) return json({ error: 'Insert failed', detail: insertErr?.message }, 500);

    return json({ snapshot_id: row.id, storage_path: path });
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
