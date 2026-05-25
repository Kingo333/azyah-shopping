// Backfill FashionCLIP analysis for the signed-in user's existing wardrobe items.
// Sequential chunked dispatch — never blocks Live Cam, never logs URLs or tokens.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const WORKER_URL = Deno.env.get('FASHIONCLIP_WORKER_URL') ?? '';
const WORKER_TOKEN = Deno.env.get('FASHIONCLIP_WORKER_TOKEN') ?? '';

const STALE_PENDING_MIN = 10;
const MAX_LIMIT = 50;
const MAX_CHUNK = 5;
const DEFAULT_LIMIT = 3;
const DEFAULT_CHUNK = 2;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

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

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // --- Auth: signed-in user only
    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'unauthorized' }, 401);
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(
      auth.replace('Bearer ', ''),
    );
    if (claimsErr || !claims?.claims) {
      return jsonResponse({ error: 'unauthorized' }, 401);
    }
    const userId = claims.claims.sub as string;

    // --- Body
    const body = (await req.json().catch(() => ({}))) as {
      limit?: number;
      chunkSize?: number;
    };
    const limit = Math.min(
      Math.max(1, Math.floor(Number(body.limit ?? DEFAULT_LIMIT))),
      MAX_LIMIT,
    );
    const chunkSize = Math.min(
      Math.max(1, Math.floor(Number(body.chunkSize ?? DEFAULT_CHUNK))),
      MAX_CHUNK,
    );

    const workerConfigured = !!WORKER_URL && !!WORKER_TOKEN;

    // --- Load user's wardrobe items (oldest first for deterministic backfill)
    const { data: items, error: itemsErr } = await admin
      .from('wardrobe_items')
      .select('id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (itemsErr) throw itemsErr;
    const itemIds = (items ?? []).map((i) => i.id);
    const total = itemIds.length;

    if (total === 0) {
      return jsonResponse({
        total: 0,
        eligible: 0,
        requestedLimit: limit,
        chunkSize,
        queued: 0,
        complete: 0,
        pending: 0,
        failed: 0,
        skipped: 0,
        missing: 0,
        workerConfigured,
        errors: [],
      });
    }

    // --- Existing analyses
    const { data: analyses } = await admin
      .from('wardrobe_garment_analysis')
      .select('wardrobe_item_id, status, prompt_hint, updated_at')
      .in('wardrobe_item_id', itemIds);
    const byItem = new Map<string, any>(
      (analyses ?? []).map((a) => [a.wardrobe_item_id, a]),
    );

    // --- Eligibility (preserves item order)
    const staleCutoff = Date.now() - STALE_PENDING_MIN * 60_000;
    const eligibleIds: string[] = [];
    for (const id of itemIds) {
      const a = byItem.get(id);
      if (!a) {
        eligibleIds.push(id);
        continue;
      }
      const emptyHint = !a.prompt_hint || String(a.prompt_hint).trim() === '';
      if (
        a.status === 'failed' ||
        a.status === 'skipped' ||
        emptyHint ||
        (a.status === 'pending' &&
          new Date(a.updated_at).getTime() < staleCutoff)
      ) {
        eligibleIds.push(id);
      }
    }

    const queue = eligibleIds.slice(0, limit);

    // --- Sequential chunked dispatch
    const triggerSecret = await getTriggerSecret();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE}`,
    };
    if (triggerSecret) headers['x-trigger-secret'] = triggerSecret;

    const analyzeUrl = `${SUPABASE_URL}/functions/v1/analyze-wardrobe-fashionclip`;

    for (let i = 0; i < queue.length; i += chunkSize) {
      const chunk = queue.slice(i, i + chunkSize);
      console.log('[fashionclip-batch] chunk', {
        user: userId,
        from: i,
        size: chunk.length,
      });
      await Promise.allSettled(
        chunk.map((id) =>
          fetch(analyzeUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({ wardrobe_item_id: id, force: true }),
          })
            .then((r) => r.text().catch(() => ''))
            .catch(() => null),
        ),
      );
    }

    // --- Re-read final state for queued items
    let complete = 0,
      pending = 0,
      failed = 0,
      skipped = 0,
      missing = 0;
    const errors: { wardrobe_item_id: string; error: string }[] = [];

    if (queue.length > 0) {
      const { data: finalRows } = await admin
        .from('wardrobe_garment_analysis')
        .select('wardrobe_item_id, status, error')
        .in('wardrobe_item_id', queue);
      const finalMap = new Map<string, any>(
        (finalRows ?? []).map((r) => [r.wardrobe_item_id, r]),
      );
      for (const id of queue) {
        const r = finalMap.get(id);
        if (!r) {
          missing += 1;
          continue;
        }
        if (r.status === 'complete') complete += 1;
        else if (r.status === 'pending') pending += 1;
        else if (r.status === 'failed') {
          failed += 1;
          if (r.error)
            errors.push({ wardrobe_item_id: id, error: String(r.error) });
        } else if (r.status === 'skipped') {
          skipped += 1;
          if (r.error)
            errors.push({ wardrobe_item_id: id, error: String(r.error) });
        }
      }
    }

    const summary = {
      total,
      eligible: eligibleIds.length,
      requestedLimit: limit,
      chunkSize,
      queued: queue.length,
      complete,
      pending,
      failed,
      skipped,
      missing,
      workerConfigured,
      errors,
    };

    console.log('[fashionclip-batch] done', {
      user: userId,
      total,
      eligible: eligibleIds.length,
      queued: queue.length,
      complete,
      pending,
      failed,
      skipped,
      missing,
      workerConfigured,
    });

    return jsonResponse(summary);
  } catch (error: any) {
    console.error('[fashionclip-batch] error', error?.message);
    return jsonResponse({ error: 'internal_error' }, 500);
  }
});
