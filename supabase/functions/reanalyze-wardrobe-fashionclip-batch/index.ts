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
const RUNPOD_API_KEY = Deno.env.get('RUNPOD_API_KEY') ?? '';

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

function normalizeWorkerUrl(raw: string): string {
  let v = (raw ?? '').trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim();
  }
  v = v.replace(/\/+$/, '');
  return v;
}

const CLEAN_WORKER_URL = normalizeWorkerUrl(WORKER_URL);

function workerDiagnostics() {
  let host = '';
  let pathShape: 'base' | 'includes_ping' | 'includes_analyze' | 'other_path' = 'base';
  let workerUrlValid = false;
  let workerUrlError: string | null = null;
  try {
    if (!CLEAN_WORKER_URL) throw new Error('empty');
    const u = new URL(CLEAN_WORKER_URL);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('bad_protocol');
    host = u.hostname;
    workerUrlValid = !!host;
    const p = u.pathname.replace(/\/+$/, '');
    if (p === '' || p === '/') pathShape = 'base';
    else if (p.endsWith('/ping')) pathShape = 'includes_ping';
    else if (p.endsWith('/analyze')) pathShape = 'includes_analyze';
    else pathShape = 'other_path';
  } catch {
    workerUrlValid = false;
    workerUrlError = 'invalid_absolute_url';
  }
  return {
    workerConfigured: !!CLEAN_WORKER_URL && !!WORKER_TOKEN,
    runpodAuthConfigured: !!RUNPOD_API_KEY,
    workerHost: host,
    workerPathShape: pathShape,
    workerUrlValid,
    workerUrlError,
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
      const ANALYZE_TIMEOUT_MS = Number(Deno.env.get('FASHIONCLIP_WORKER_TIMEOUT_MS') ?? '90000') || 90_000;
      const PING_TIMEOUT_MS = 8_000;

      const result: any = {
        mode: 'smoke-test',
        ...wDiag,
        workerTokenConfigured: !!WORKER_TOKEN,
        finalPingPath: `${CLEAN_WORKER_URL}/ping`,
        finalAnalyzePath: `${CLEAN_WORKER_URL}/analyze`,
        pingStatus: null as number | null,
        pingDurationMs: null as number | null,
        pingTimeoutMs: PING_TIMEOUT_MS,
        pingBodySummary: '',
        pingError: null as string | null,
        analyzeStatus: null as number | null,
        analyzeDurationMs: null as number | null,
        analyzeError: null as string | null,
        analyzeTimeoutMs: ANALYZE_TIMEOUT_MS,
        analyzeTimedOutBeforeResponse: false,
        analyzeResponseSummary: '',
        analyzeBodySummary: '',
        analyzeResponseKeys: [] as string[],
        usedWardrobeItem: false,
      };

      if (!wDiag.workerConfigured || !wDiag.workerUrlValid) {
        result.analyzeError = !wDiag.workerConfigured
          ? 'worker_not_configured'
          : 'invalid_absolute_url';
        return jsonResponse(result);
      }

      const base = CLEAN_WORKER_URL;

      // /ping
      {
        const c = new AbortController();
        const t = setTimeout(() => c.abort(), PING_TIMEOUT_MS);
        const startedAt = Date.now();
        try {
          const r = await fetch(`${base}/ping`, {
            method: 'GET',
            signal: c.signal,
            headers: {
              'Authorization': `Bearer ${RUNPOD_API_KEY}`,
              'X-Worker-Token': WORKER_TOKEN,
            },
          });
          clearTimeout(t);
          result.pingStatus = r.status;
          result.pingDurationMs = Date.now() - startedAt;
          const pingText = await r.text().catch(() => '');
          result.pingBodySummary = summarizeBody(pingText);
        } catch (e: any) {
          clearTimeout(t);
          result.pingDurationMs = Date.now() - startedAt;
          result.pingError = e?.name === 'AbortError' ? 'timeout' : 'unreachable';
        }
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
      {
        const c = new AbortController();
        const t = setTimeout(() => c.abort(), ANALYZE_TIMEOUT_MS);
        const startedAt = Date.now();
        try {
          const r = await fetch(`${base}/analyze`, {
            method: 'POST',
            signal: c.signal,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${RUNPOD_API_KEY}`,
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
          result.analyzeDurationMs = Date.now() - startedAt;
          result.analyzeStatus = r.status;
          const text = await r.text().catch(() => '');
          const summary = summarizeBody(text);
          result.analyzeBodySummary = summary;
          try {
            const json = JSON.parse(text);
            result.analyzeResponseKeys = Object.keys(json || {});
            if (!r.ok) {
              result.analyzeError = summary;
              result.analyzeResponseSummary = summary;
            }
          } catch {
            if (!r.ok) {
              result.analyzeError = summary;
              result.analyzeResponseSummary = summary;
            }
          }
        } catch (e: any) {
          clearTimeout(t);
          result.analyzeDurationMs = Date.now() - startedAt;
          if (e?.name === 'AbortError') {
            result.analyzeError = 'timeout';
            result.analyzeTimedOutBeforeResponse = true;
          } else {
            result.analyzeError = 'unreachable';
          }
        }
      }

      console.log('[fashionclip-batch] smoke-test', {
        host: wDiag.workerHost,
        pathShape: wDiag.workerPathShape,
        workerTokenConfigured: !!WORKER_TOKEN,
        pingStatus: result.pingStatus,
        pingDurationMs: result.pingDurationMs,
        pingTimeoutMs: result.pingTimeoutMs,
        pingBodyLen: (result.pingBodySummary || '').length,
        analyzeStatus: result.analyzeStatus,
        analyzeDurationMs: result.analyzeDurationMs,
        analyzeTimeoutMs: result.analyzeTimeoutMs,
        analyzeTimedOutBeforeResponse: result.analyzeTimedOutBeforeResponse,
        analyzeBodyLen: (result.analyzeBodySummary || '').length,
        pingError: result.pingError,
        analyzeError: result.analyzeError ? '(set)' : null,
      });

      return jsonResponse(result);
    }

    // ====================================================================
    // BACKFILL MODE — image-URL dedup + fanout (MVP)
    // ====================================================================
    const BACKFILL_ANALYZE_TIMEOUT_MS = Number(Deno.env.get('FASHIONCLIP_WORKER_TIMEOUT_MS') ?? '90000') || 90_000;
    const BACKFILL_WRAPPER_TIMEOUT_MS = BACKFILL_ANALYZE_TIMEOUT_MS + 15_000;
    const limit = Math.min(
      Math.max(1, Math.floor(Number(body.limit ?? DEFAULT_LIMIT))),
      MAX_LIMIT,
    );
    const chunkSize = Math.min(
      Math.max(1, Math.floor(Number(body.chunkSize ?? DEFAULT_CHUNK))),
      MAX_CHUNK,
    );

    // Short non-reversible hash of a URL — never leak raw URLs in response/logs.
    async function shortUrlHash(s: string): Promise<string> {
      const bytes = new TextEncoder().encode(s);
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const hex = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      return hex.slice(0, 10);
    }
    function normalizeUrl(row: { image_url?: string | null; image_bg_removed_url?: string | null }): string {
      const u = (row.image_bg_removed_url || row.image_url || '').trim();
      return u;
    }

    // Load this user's wardrobe rows (oldest first) with image URLs.
    const { data: items, error: itemsErr } = await admin
      .from('wardrobe_items')
      .select('id, image_url, image_bg_removed_url, category, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (itemsErr) throw itemsErr;
    const allRows = (items ?? []) as Array<{
      id: string;
      image_url: string | null;
      image_bg_removed_url: string | null;
      category: string | null;
      created_at: string;
    }>;
    const totalRows = allRows.length;

    if (totalRows === 0) {
      return jsonResponse({
        totalRows: 0,
        uniqueUrlsTotal: 0,
        uniqueUrlsAlreadyComplete: 0,
        uniqueUrlsRemaining: 0,
        linkedWithoutWorker: 0,
        workerCalls: 0,
        rowsCompletedByFanout: 0,
        requestedLimit: limit,
        chunkSize,
        queued: 0,
        complete: 0,
        pending: 0,
        failed: 0,
        skipped: 0,
        missing: 0,
        ...wDiag,
        perUrl: [],
        perItem: [],
      });
    }

    const itemIds = allRows.map((r) => r.id);

    // Load existing analysis for this user's rows.
    const { data: analyses } = await admin
      .from('wardrobe_garment_analysis')
      .select('wardrobe_item_id, status, prompt_hint, updated_at, metadata, confidence, image_hash, analysis_version, model_name, source_image_url')
      .in('wardrobe_item_id', itemIds);
    const byItem = new Map<string, any>((analyses ?? []).map((a) => [a.wardrobe_item_id, a]));

    const staleCutoff = Date.now() - STALE_PENDING_MIN * 60_000;
    function isEligible(a: any | undefined): boolean {
      if (!a) return true;
      const emptyHint = !a.prompt_hint || String(a.prompt_hint).trim() === '';
      return (
        a.status === 'failed' ||
        a.status === 'skipped' ||
        emptyHint ||
        (a.status === 'pending' && new Date(a.updated_at).getTime() < staleCutoff)
      );
    }

    // Group rows by normalized URL.
    const rowsByUrl = new Map<string, typeof allRows>();
    for (const r of allRows) {
      const u = normalizeUrl(r);
      if (!u) continue;
      const arr = rowsByUrl.get(u) ?? [];
      arr.push(r);
      rowsByUrl.set(u, arr);
    }
    const uniqueUrlsTotal = rowsByUrl.size;

    // Determine which unique URLs already have a complete analysis (in user's rows).
    const completeByUrl = new Map<string, any>(); // url -> source analysis row
    for (const r of allRows) {
      const a = byItem.get(r.id);
      const u = normalizeUrl(r);
      if (!u || !a) continue;
      const hintOk = a.prompt_hint && String(a.prompt_hint).trim() !== '';
      if (a.status === 'complete' && hintOk && !completeByUrl.has(u)) {
        completeByUrl.set(u, a);
      }
    }
    const uniqueUrlsAlreadyComplete = completeByUrl.size;

    // Helper: upsert analysis row by copying source analysis fields to target item.
    async function copyAnalysisTo(targetItemId: string, source: any, srcUrl: string) {
      const payload = {
        wardrobe_item_id: targetItemId,
        status: 'complete',
        error: null,
        metadata: source.metadata ?? null,
        prompt_hint: source.prompt_hint ?? null,
        confidence: source.confidence ?? null,
        image_hash: source.image_hash ?? null,
        analysis_version: source.analysis_version ?? null,
        model_name: source.model_name ?? null,
        source_image_url: source.source_image_url ?? srcUrl,
        updated_at: new Date().toISOString(),
      };
      await admin
        .from('wardrobe_garment_analysis')
        .upsert(payload, { onConflict: 'wardrobe_item_id' });
    }

    type PerItem = {
      wardrobe_item_id: string;
      urlHash: string;
      action: 'prelinked' | 'representative' | 'fanout' | 'skipped';
      calledAnalyze: boolean;
      analyzeStatus: number | null;
      analyzeResponseSummary: string;
      finalDbStatus: 'complete' | 'pending' | 'failed' | 'skipped' | 'missing';
      finalDbError: string | null;
    };
    const perItem: PerItem[] = [];

    let linkedWithoutWorker = 0;

    // ---- Step A: Pre-link pass (no RunPod calls) ----
    // For every eligible row whose URL already has a complete analysis elsewhere,
    // copy that analysis into the row.
    const remainingEligibleByUrl = new Map<string, typeof allRows>();
    for (const [url, rows] of rowsByUrl.entries()) {
      const urlHash = await shortUrlHash(url);
      const source = completeByUrl.get(url);
      const stillEligible: typeof allRows = [];
      for (const r of rows) {
        const a = byItem.get(r.id);
        if (!isEligible(a)) continue;
        if (source) {
          try {
            await copyAnalysisTo(r.id, source, url);
            linkedWithoutWorker += 1;
            perItem.push({
              wardrobe_item_id: r.id,
              urlHash,
              action: 'prelinked',
              calledAnalyze: false,
              analyzeStatus: null,
              analyzeResponseSummary: 'linked_from_existing',
              finalDbStatus: 'complete',
              finalDbError: null,
            });
          } catch (e: any) {
            stillEligible.push(r);
            perItem.push({
              wardrobe_item_id: r.id,
              urlHash,
              action: 'skipped',
              calledAnalyze: false,
              analyzeStatus: null,
              analyzeResponseSummary: 'prelink_failed',
              finalDbStatus: 'missing',
              finalDbError: e?.message ?? null,
            });
          }
        } else {
          stillEligible.push(r);
        }
      }
      if (stillEligible.length > 0 && !source) {
        remainingEligibleByUrl.set(url, stillEligible);
      }
    }

    const uniqueUrlsRemaining = remainingEligibleByUrl.size;

    // ---- Step B: One representative per remaining unique URL ----
    const urlQueue: Array<{ url: string; rep: (typeof allRows)[number]; dupes: typeof allRows }> = [];
    for (const [url, rows] of remainingEligibleByUrl.entries()) {
      const sorted = rows.slice().sort((a, b) => a.created_at.localeCompare(b.created_at));
      const rep = sorted[0];
      const dupes = sorted.slice(1);
      urlQueue.push({ url, rep, dupes });
    }
    const dispatchQueue = urlQueue.slice(0, limit);

    // Auth headers (unchanged).
    const triggerSecret = await getTriggerSecret();
    const analyzeUrl = `${SUPABASE_URL}/functions/v1/analyze-wardrobe-fashionclip`;
    const analyzeHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
    };
    let authMode: 'trigger_secret' | 'user_jwt' = 'user_jwt';
    if (triggerSecret) {
      analyzeHeaders['x-trigger-secret'] = triggerSecret;
      analyzeHeaders['Authorization'] = `Bearer ${SERVICE_ROLE}`;
      authMode = 'trigger_secret';
    } else {
      analyzeHeaders['Authorization'] = auth;
      authMode = 'user_jwt';
    }

    type PerUrl = {
      urlHash: string;
      representativeItemId: string;
      duplicateCount: number;
      analyzeStatus: number | null;
      finalDbStatus: 'complete' | 'pending' | 'failed' | 'skipped' | 'missing';
      fannedOutCount: number;
      summary: string;
    };
    const perUrl: PerUrl[] = [];
    let workerCalls = 0;
    let rowsCompletedByFanout = 0;

    // Sequential chunked dispatch per representative URL.
    for (let i = 0; i < dispatchQueue.length; i += chunkSize) {
      const chunk = dispatchQueue.slice(i, i + chunkSize);
      const outcomes = await Promise.all(
        chunk.map(async ({ url, rep, dupes }) => {
          const urlHash = await shortUrlHash(url);
          const pu: PerUrl = {
            urlHash,
            representativeItemId: rep.id,
            duplicateCount: dupes.length,
            analyzeStatus: null,
            finalDbStatus: 'missing',
            fannedOutCount: 0,
            summary: '',
          };
          const repItem: PerItem = {
            wardrobe_item_id: rep.id,
            urlHash,
            action: 'representative',
            calledAnalyze: false,
            analyzeStatus: null,
            analyzeResponseSummary: '',
            finalDbStatus: 'missing',
            finalDbError: null,
          };
          try {
            const c = new AbortController();
            const t = setTimeout(() => c.abort(), BACKFILL_WRAPPER_TIMEOUT_MS);
            const r = await fetch(analyzeUrl, {
              method: 'POST',
              signal: c.signal,
              headers: analyzeHeaders,
              body: JSON.stringify({ wardrobe_item_id: rep.id, force: true }),
            });
            clearTimeout(t);
            workerCalls += 1;
            repItem.calledAnalyze = true;
            repItem.analyzeStatus = r.status;
            pu.analyzeStatus = r.status;
            const text = await r.text().catch(() => '');
            repItem.analyzeResponseSummary = summarizeBody(text);
            pu.summary = repItem.analyzeResponseSummary;
          } catch (e: any) {
            const msg = e?.name === 'AbortError' ? 'timeout' : 'unreachable';
            repItem.analyzeResponseSummary = msg;
            pu.summary = msg;
          }

          // Re-read representative's analysis row.
          const { data: row } = await admin
            .from('wardrobe_garment_analysis')
            .select('status, error, metadata, prompt_hint, confidence, image_hash, analysis_version, model_name, source_image_url')
            .eq('wardrobe_item_id', rep.id)
            .maybeSingle();
          if (row) {
            repItem.finalDbStatus = (row as any).status ?? 'missing';
            repItem.finalDbError = (row as any).error ?? null;
            pu.finalDbStatus = repItem.finalDbStatus;
          }
          perItem.push(repItem);

          // Fanout only if representative succeeded.
          if (
            row &&
            (row as any).status === 'complete' &&
            (row as any).prompt_hint &&
            String((row as any).prompt_hint).trim() !== ''
          ) {
            for (const d of dupes) {
              try {
                await copyAnalysisTo(d.id, row, url);
                rowsCompletedByFanout += 1;
                pu.fannedOutCount += 1;
                perItem.push({
                  wardrobe_item_id: d.id,
                  urlHash,
                  action: 'fanout',
                  calledAnalyze: false,
                  analyzeStatus: null,
                  analyzeResponseSummary: 'fanout_from_representative',
                  finalDbStatus: 'complete',
                  finalDbError: null,
                });
              } catch (e: any) {
                perItem.push({
                  wardrobe_item_id: d.id,
                  urlHash,
                  action: 'skipped',
                  calledAnalyze: false,
                  analyzeStatus: null,
                  analyzeResponseSummary: 'fanout_failed',
                  finalDbStatus: 'missing',
                  finalDbError: e?.message ?? null,
                });
              }
            }
          } else {
            // Do not fan out failures.
            for (const d of dupes) {
              perItem.push({
                wardrobe_item_id: d.id,
                urlHash,
                action: 'skipped',
                calledAnalyze: false,
                analyzeStatus: null,
                analyzeResponseSummary: 'representative_not_complete',
                finalDbStatus: 'missing',
                finalDbError: null,
              });
            }
          }
          return pu;
        }),
      );
      perUrl.push(...outcomes);
    }

    // Aggregate final counts from perItem.
    let complete = 0,
      pending = 0,
      failed = 0,
      skipped = 0,
      missing = 0;
    for (const r of perItem) {
      if (r.finalDbStatus === 'complete') complete += 1;
      else if (r.finalDbStatus === 'pending') pending += 1;
      else if (r.finalDbStatus === 'failed') failed += 1;
      else if (r.finalDbStatus === 'skipped') skipped += 1;
      else missing += 1;
    }

    console.log('[fashionclip-batch] done', {
      user: userId,
      totalRows,
      uniqueUrlsTotal,
      uniqueUrlsAlreadyComplete,
      uniqueUrlsRemaining,
      linkedWithoutWorker,
      workerCalls,
      rowsCompletedByFanout,
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
      totalRows,
      uniqueUrlsTotal,
      uniqueUrlsAlreadyComplete,
      uniqueUrlsRemaining,
      linkedWithoutWorker,
      workerCalls,
      rowsCompletedByFanout,
      requestedLimit: limit,
      chunkSize,
      queued: workerCalls,
      complete,
      pending,
      failed,
      skipped,
      missing,
      ...wDiag,
      authMode,
      perUrl,
      perItem,
    });
  } catch (error: any) {
    console.error('[fashionclip-batch] error', error?.message);
    return jsonResponse({ error: 'internal_error', detail: error?.message ?? null }, 500);
  }
});
