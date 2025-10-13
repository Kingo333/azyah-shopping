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

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = req.headers.get('Authorization');
  if (!auth) return json(401, { error: 'Missing auth' });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    global: { headers: { Authorization: auth } }
  });

  try {
    const { jobId, timeoutMs = 180000 } = await req.json();
    
    if (!jobId) return json(400, { error: 'jobId required' });
    if (!BITSTUDIO_API_KEY) {
      console.error('[Poll] BITSTUDIO_API_KEY not configured');
      return json(500, { error: 'BitStudio API key not configured' });
    }

    const { data: job } = await admin
      .from('event_tryon_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (!job) {
      console.log('[Poll] Job not found (deleted?):', jobId);
      return json(404, { error: 'Job not found' });
    }

    if (!job.provider_job_id) {
      console.warn('[Poll] Job has no provider_job_id:', jobId);
      return json(422, { error: 'provider_job_id is null' });
    }

    // Owner check
    const { data: me } = await admin.auth.getUser();
    if (!me?.user || me.user.id !== job.user_id) {
      console.error('[Poll] Forbidden - user mismatch');
      return json(403, { error: 'Forbidden' });
    }

    console.log('[Poll] Polling job:', job.provider_job_id);

    // Poll with exponential backoff
    const start = Date.now();
    let delay = 2000;

    while (true) {
      if (Date.now() - start > timeoutMs) {
        console.error('[Poll] Polling timeout');
        await admin
          .from('event_tryon_jobs')
          .update({ status: 'failed', error: 'Polling timeout' })
          .eq('id', jobId);
        return json(504, { error: 'Polling timeout' });
      }

      const res = await fetch(`${BITSTUDIO_BASE}/images/${job.provider_job_id}`, {
        headers: { 'Authorization': `Bearer ${BITSTUDIO_API_KEY}` }
      });

      if (!res.ok) {
        console.error('[Poll] BitStudio API error:', res.status);
        throw new Error(`BitStudio API error: ${res.status}`);
      }

      const info = await res.json();
      console.log('[Poll] BitStudio status:', info?.status);

      // Persist provider status for observability
      await admin
        .from('event_tryon_jobs')
        .update({
          provider_status: info?.status ?? null,
          provider_raw: info ?? null
        })
        .eq('id', jobId);

      if (info?.status === 'completed' && info?.path) {
        console.log('[Poll] Job completed, downloading image from:', info.path);
        
        const imgRes = await fetch(info.path);
        if (!imgRes.ok) {
          throw new Error(`Failed to fetch result image (${imgRes.status})`);
        }

        const buf = new Uint8Array(await imgRes.arrayBuffer());
        const blob = new Blob([buf], { type: 'image/jpeg' });

        const outPath = `event_tryon_results/${job.event_id}/${job.user_id}/${job.product_id}.jpg`;
        console.log('[Poll] Uploading to storage:', outPath);
        
        const up = await admin.storage
          .from('event-tryon-results')
          .upload(outPath, blob, {
            upsert: true,
            contentType: 'image/jpeg'
          });

        if (up.error) {
          console.error('[Poll] Storage upload error:', up.error);
          throw new Error(up.error.message);
        }

        await admin
          .from('event_tryon_jobs')
          .update({
            status: 'succeeded',
            output_path: outPath,
            completed_at: new Date().toISOString()
          })
          .eq('id', jobId);

        console.log('[Poll] Job completed successfully');
        return json(200, { ok: true, output_path: outPath, status: 'succeeded' });
      }

      if (info?.status === 'failed') {
        console.error('[Poll] Provider failed:', info?.error);
        await admin
          .from('event_tryon_jobs')
          .update({
            status: 'failed',
            error: 'Provider: failed',
            completed_at: new Date().toISOString()
          })
          .eq('id', jobId);
        return json(500, { error: 'Provider failed', status: 'failed' });
      }

      // Still processing - backoff and retry
      console.log(`[Poll] Still ${info?.status}, waiting ${delay}ms...`);
      await sleep(delay);
      delay = Math.min(delay * 1.5, 6000);
    }
  } catch (e) {
    console.error('[Poll] Error:', e);
    return json(500, { error: String(e) });
  }
});