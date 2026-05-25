// Backfill FashionCLIP analysis for the signed-in user's existing wardrobe items.
// Sequential chunked dispatch — never blocks Live Cam.
// Returns per-item diagnostics so failures are never hidden as "missing".
// Also supports { mode: "smoke-test" } to probe the worker directly.

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

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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

function workerDiagnostics() {
  let host = '';
  let pathShape: 'base' | 'includes_ping' | 'includes_analyze' | 'other_path' = 'base';
  try {
    const u = new URL(WORKER_URL);
    host = u.hostname;
    const p = u.pathname.replace(/\/+$/, '');
    if (p === '' || p === '/') pathShape = 'base';
    else if (p.endsWith('/ping')) pathShape = 'includes_ping';
    else if (p.endsWith('/analyze')) pathShape = 'includes_analyze';
    else pathShape = 'other_path';
  } catch {
    /* noop */
  }
  return {
    workerConfigured: !!WORKER_URL && !!WORKER_TOKEN,
    workerHost: host,
    workerPathShape: pathShape,
  };
}

function summarizeBody(text: string): string {
  if (!text) return '';
  // Drop anything that looks long/sensitive; truncate.
  const trimmed = text.replace(/\s+/g, ' ').slice(0, 240);
  return trimmed;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // --- Auth
    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'unauthorized', reason: 'missing_bearer' }, 401);
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const token = auth.replace('Bearer ', '');
    let userId: string | null = null;
    const { data: claims } = await userClient.auth.getClaims(token);
    if (claims?.claims?.sub) userId = claims.claims.sub as string;
    if (!userId) {
      const { data: u } = await userClient.auth.getUser(token);
      if (u?.user?.id) userId = u.user.id;
    }
    if (!userId) {
      return jsonResponse({ error: 'unauthorized', reason: 'invalid_token' }, 401);
    }

    const body = (await req.json().catch(() => ({}))) as {
      mode?: string;
      limit?: number;
      chunkSize?: number;
    };

    const wDiag = workerDiagnostics();

    // ====================================================================
    // SMOKE TEST MODE — probe worker /ping and /analyze with one user item
    // ====================================================================
    if (body.mode === 'smoke-test') {
      const result: any = {
        mode: 'smoke-test',
        ...wDiag,
        pingStatus: null as number | null,
        pingError: null as string | null,
        analyzeStatus: null as number | null,
        analyzeError: null as string | null,
        analyzeResponseKeys: [] as string[],
        usedWardrobeItem: false,
      };

      if (!wDiag.workerConfigured) {
        result.analyzeError = 'worker_not_configured';
        return jsonResponse(result);
      }

      const base = WORKER_URL.replace(/\/$/, '');

      // /ping
      try {
        const c = new AbortController();
        const t = setTimeout(() => c.abort(), 8_000);
        const r = await fetch(`${base}/ping`, {
          method: 'GET',
          signal: c.signal,
          headers: { 'X-Worker-Token': WORKER_TOKEN },
        });
        clearTimeout(t);
        result.pingStatus = r.status;
        await r.text().catch(() => '');
      } catch (e: any) {
        result.pingError = e?.name === 'AbortError' ? 'timeout' : 'unreachable';
      }

      // pick one item owned by user (any item with an image)
      const { data: item } = await admin
        .from('wardrobe_items')
        .select('id, image_url, image_bg_removed_url, category')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!item) {
        result.analyzeError = 'no_wardrobe_item';
        return jsonResponse(result);
      }

      const imageUrl = (item as any).image_bg_removed_url || (item as any).image_url;
      if (!imageUrl) {
        result.analyzeError = 'no_image_url';
        return jsonResponse(result);
      }
      result.usedWardrobeItem = true;

      // /analyze
      try {
        const c = new AbortController();
        const t = setTimeout(() => c.abort(), 20_000);
        const r = await fetch(`${base}/analyze`, {
          method: 'POST',
          signal: c.signal,
          headers: {
            'Content-Type': 'application/json',
            'X-Worker-Token': WORKER_TOKEN,
          },
          body: JSON.stringify({
            wardrobe_item_id: 'smoke-test',
            image_url: imageUrl,
            category: (item as any).category ?? 'top',
            category_hint: (item as any).category ?? 'top',
          }),
        });
        clearTimeout(t);
        result.analyzeStatus = r.status;
        const text = await r.text().catch(() => '');
        try {
          const json = JSON.parse(text);
          result.analyzeResponseKeys = Object.keys(json || {});
          if (!r.ok) result.analyzeError = summarizeBody(text);
        } catch {
          if (!r.ok) result.analyzeError = summarizeBody(text);
        }
      } catch (e: any) {
        result.analyzeError = e?.name === 'AbortError' ? 'timeout' : 'unreachable';
      }

      console.log('[fashionclip-batch] smoke-test', {
        host: wDiag.workerHost,
        pathShape: wDiag.workerPathShape,
        pingStatus: result.pingStatus,
        analyzeStatus: result.analyzeStatus,
        pingError: result.pingError,
        analyzeError: result.analyzeError ? '(set)' : null,
      });

      return jsonResponse(result);
    }

    // ====================================================================
    // BACKFILL MODE
    // ====================================================================
    const limit = Math.min(
      Math.max(1, Math.floor(Number(body.limit ?? DEFAULT_LIMIT))),
      MAX_LIMIT,
    );
    const chunkSize = Math.min(
      Math.max(1, Math.floor(Number(body.chunkSize ?? DEFAULT_CHUNK))),
      MAX_CHUNK,
    );

    // Load user's wardrobe items (oldest first)
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
        ...wDiag,
        items: [],
      });
    }

    const { data: analyses } = await admin
      .from('wardrobe_garment_analysis')
      .select('wardrobe_item_id, status, prompt_hint, updated_at')
      .in('wardrobe_item_id', itemIds);
    const byItem = new Map<string, any>(
      (analyses ?? []).map((a) => [a.wardrobe_item_id, a]),
    );

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

    // Auth headers for analyze:
    // prefer x-trigger-secret if configured; otherwise pass user's Authorization.
    const triggerSecret = await getTriggerSecret();
    const analyzeUrl = `${SUPABASE_URL}/functions/v1/analyze-wardrobe-fashionclip`;
    const analyzeHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
    };
    let authMode: 'trigger_secret' | 'user_jwt' = 'user_jwt';
    if (triggerSecret) {
      analyzeHeaders['x-trigger-secret'] = triggerSecret;
      // Still send an Authorization to satisfy verify_jwt=true; use service role here
      // because this is a server-to-server call and the trigger secret enforces the
      // analyze-side authorization. Never logged or returned.
      analyzeHeaders['Authorization'] = `Bearer ${SERVICE_ROLE}`;
      authMode = 'trigger_secret';
    } else {
      // Forward the signed-in user's Authorization so analyze can verify ownership.
      analyzeHeaders['Authorization'] = auth;
      authMode = 'user_jwt';
    }

    type ItemDiag = {
      wardrobe_item_id: string;
      calledAnalyze: boolean;
      analyzeStatus: number | null;
      analyzeResponseSummary: string;
      finalDbStatus: 'complete' | 'pending' | 'failed' | 'skipped' | 'missing';
      finalDbError: string | null;
    };
    const itemResults: ItemDiag[] = [];

    // Sequential chunked dispatch with awaited responses
    for (let i = 0; i < queue.length; i += chunkSize) {
      const chunk = queue.slice(i, i + chunkSize);
      const chunkOutcomes = await Promise.all(
        chunk.map(async (id) => {
          const out: ItemDiag = {
            wardrobe_item_id: id,
            calledAnalyze: false,
            analyzeStatus: null,
            analyzeResponseSummary: '',
            finalDbStatus: 'missing',
            finalDbError: null,
          };
          try {
            const c = new AbortController();
            const t = setTimeout(() => c.abort(), 30_000);
            const r = await fetch(analyzeUrl, {
              method: 'POST',
              signal: c.signal,
              headers: analyzeHeaders,
              body: JSON.stringify({ wardrobe_item_id: id, force: true }),
            });
            clearTimeout(t);
            out.calledAnalyze = true;
            out.analyzeStatus = r.status;
            const text = await r.text().catch(() => '');
            out.analyzeResponseSummary = summarizeBody(text);
          } catch (e: any) {
            out.analyzeResponseSummary =
              e?.name === 'AbortError' ? 'timeout' : 'unreachable';
          }

          // Re-read DB row
          const { data: row } = await admin
            .from('wardrobe_garment_analysis')
            .select('status, error')
            .eq('wardrobe_item_id', id)
            .maybeSingle();
          if (row) {
            out.finalDbStatus = (row as any).status ?? 'missing';
            out.finalDbError = (row as any).error ?? null;
          }
          return out;
        }),
      );
      itemResults.push(...chunkOutcomes);
    }

    // Aggregate
    let complete = 0,
      pending = 0,
      failed = 0,
      skipped = 0,
      missing = 0;
    for (const r of itemResults) {
      if (r.finalDbStatus === 'complete') complete += 1;
      else if (r.finalDbStatus === 'pending') pending += 1;
      else if (r.finalDbStatus === 'failed') failed += 1;
      else if (r.finalDbStatus === 'skipped') skipped += 1;
      else missing += 1;
    }

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
      authMode,
      host: wDiag.workerHost,
      pathShape: wDiag.workerPathShape,
    });

    return jsonResponse({
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
      ...wDiag,
      authMode,
      items: itemResults,
    });
  } catch (error: any) {
    console.error('[fashionclip-batch] error', error?.message);
    return jsonResponse({ error: 'internal_error', detail: error?.message ?? null }, 500);
  }
});
