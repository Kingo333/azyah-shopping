// Backfill Gemini analyses across all user wardrobe items.
// Dedup by normalized image-URL hash → one Gemini call per unique image, then fan-out to twins.
// Safe defaults: { limit: 3, chunkSize: 1 }. Smoke-test branch: { mode: 'smoke-test' }.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-trigger-secret',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const GEMINI_TRIGGER_SECRET = Deno.env.get('GEMINI_TRIGGER_SECRET') ?? '';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

function normalizeUrlForHash(raw: string): string {
  let v = (raw ?? '').trim();
  if (!v) return '';
  try {
    const u = new URL(v);
    u.search = '';
    u.hash = '';
    let s = u.toString();
    if (s.endsWith('/')) s = s.slice(0, -1);
    return s;
  } catch {
    return v.replace(/[?#].*$/, '').replace(/\/+$/, '');
  }
}
async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function getCallerUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const { data, error } = await userClient.auth.getClaims(auth.replace('Bearer ', ''));
  if (error || !data?.claims?.sub) return null;
  return data.claims.sub as string;
}

async function invokeAnalyze(wardrobe_item_id: string, force: boolean, callerAuth: string | null) {
  // Prefer the caller's user JWT (analyzer will match claims.sub === item.user_id).
  // Fall back to internal trigger secret only when no caller JWT is available.
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (callerAuth?.startsWith('Bearer ')) {
    headers['Authorization'] = callerAuth;
  } else if (GEMINI_TRIGGER_SECRET) {
    headers['x-trigger-secret'] = GEMINI_TRIGGER_SECRET;
  }

  const url = `${SUPABASE_URL}/functions/v1/analyze-wardrobe-gemini`;
  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ wardrobe_item_id, force }),
  });
  const text = await resp.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch {}
  return { status: resp.status, json, summary: text.replace(/\s+/g, ' ').slice(0, 240) };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const callerAuth = req.headers.get('Authorization');
    const userId = await getCallerUserId(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json().catch(() => ({}))) as any;

    if (body?.mode === 'smoke-test') {
      // Probe Gemini key + trigger secret presence (no values exposed).
      return new Response(JSON.stringify({
        ok: true,
        geminiKeyConfigured: !!GEMINI_API_KEY,
        triggerSecretConfigured: !!GEMINI_TRIGGER_SECRET,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Accept { provider: 'gemini_only' } as an explicit no-op marker for the UI.
    const limit = Math.max(1, Math.min(50, Number(body?.limit ?? 3)));
    const chunkSize = Math.max(1, Math.min(5, Number(body?.chunkSize ?? 1)));
    const force = !!body?.force;

    // Fetch all wardrobe items for caller.
    const { data: items, error: itemsErr } = await admin
      .from('wardrobe_items')
      .select('id, image_url, image_bg_removed_url')
      .eq('user_id', userId);
    if (itemsErr) throw itemsErr;

    const rows = (items ?? []).filter((r: any) => (r.image_bg_removed_url || r.image_url));
    const totalRows = rows.length;

    // Group by image hash.
    type Group = { hash: string; rawUrl: string; itemIds: string[] };
    const groups = new Map<string, Group>();
    for (const r of rows as any[]) {
      const raw = r.image_bg_removed_url || r.image_url;
      const hash = await sha256Hex(normalizeUrlForHash(raw));
      const g = groups.get(hash) ?? { hash, rawUrl: raw, itemIds: [] };
      g.itemIds.push(r.id);
      groups.set(hash, g);
    }
    const uniqueUrlsTotal = groups.size;

    // Find which hashes already have a Gemini-complete row.
    const { data: existing } = await admin
      .from('wardrobe_garment_analysis')
      .select('image_hash, gemini_status')
      .in('image_hash', Array.from(groups.keys()));
    const doneHashes = new Set<string>();
    for (const a of (existing ?? []) as any[]) {
      if (a.gemini_status === 'complete') doneHashes.add(a.image_hash);
    }
    const uniqueUrlsAlreadyComplete = doneHashes.size;

    // Remaining to call worker for.
    const remainingGroups = Array.from(groups.values()).filter((g) => force || !doneHashes.has(g.hash));
    const queue = remainingGroups.slice(0, limit);
    const uniqueUrlsRemaining = remainingGroups.length;

    // Process in chunks.
    let workerCalls = 0;
    let complete = 0;
    let failed = 0;
    let skipped = 0;
    let cached = 0;
    let fanoutFromSelf = 0;
    const perUrl: any[] = [];

    for (let i = 0; i < queue.length; i += chunkSize) {
      const chunk = queue.slice(i, i + chunkSize);
      const results = await Promise.all(
        chunk.map(async (g) => {
          const firstId = g.itemIds[0];
          workerCalls += 1;
          const res = await invokeAnalyze(firstId, force);
          const status = res.json?.status ?? `http_${res.status}`;
          if (status === 'complete') complete += 1;
          else if (status === 'fanout' || status === 'cached') cached += 1;
          else if (status === 'failed') failed += 1;
          else if (status === 'skipped') skipped += 1;

          // Fan-out to other rows sharing the same image (twins).
          let fanned = 0;
          if (status === 'complete' || status === 'fanout' || status === 'cached') {
            for (const id of g.itemIds.slice(1)) {
              const r = await invokeAnalyze(id, false);
              if (r.json?.status === 'fanout' || r.json?.status === 'cached' || r.json?.status === 'complete') fanned += 1;
            }
            fanoutFromSelf += fanned;
          }

          return {
            urlHash: g.hash.slice(0, 10),
            duplicateCount: g.itemIds.length,
            firstItemId: firstId,
            analyzeStatus: status,
            httpStatus: res.status,
            summary: res.summary,
            fannedOutCount: fanned,
          };
        }),
      );
      perUrl.push(...results);
    }

    return new Response(JSON.stringify({
      totalRows,
      uniqueUrlsTotal,
      uniqueUrlsAlreadyComplete,
      uniqueUrlsRemaining,
      processedThisRun: queue.length,
      workerCalls,
      rowsCompletedByFanout: fanoutFromSelf,
      complete,
      cached,
      failed,
      skipped,
      perUrl,
      geminiKeyConfigured: !!GEMINI_API_KEY,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('[gemini-batch] unhandled', error?.message);
    return new Response(JSON.stringify({ error: error?.message ?? 'internal_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
