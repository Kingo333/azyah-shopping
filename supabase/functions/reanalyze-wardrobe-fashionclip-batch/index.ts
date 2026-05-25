// Batch re-analysis: reprocess missing / failed / skipped / stale-pending
// wardrobe_garment_analysis rows. Authenticated users can only reprocess
// their own wardrobe items. Triggers analyze-wardrobe-fashionclip with force=true.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const STALE_PENDING_MIN = 10;
const MAX_BATCH = 50;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(
      auth.replace('Bearer ', '')
    );
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claims.claims.sub;

    const body = (await req.json().catch(() => ({}))) as {
      include_statuses?: string[];
      include_missing?: boolean;
      limit?: number;
    };
    const includeStatuses = body.include_statuses ?? ['failed', 'skipped'];
    const includeMissing = body.include_missing ?? true;
    const limit = Math.min(body.limit ?? MAX_BATCH, MAX_BATCH);

    // 1. User's wardrobe items
    const { data: items, error: itemsErr } = await admin
      .from('wardrobe_items')
      .select('id')
      .eq('user_id', userId);
    if (itemsErr) throw itemsErr;
    const itemIds = (items ?? []).map((i) => i.id);
    if (itemIds.length === 0) {
      return new Response(JSON.stringify({ queued: 0, total: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Existing analyses
    const { data: analyses } = await admin
      .from('wardrobe_garment_analysis')
      .select('wardrobe_item_id, status, updated_at')
      .in('wardrobe_item_id', itemIds);
    const byItem = new Map(
      (analyses ?? []).map((a) => [a.wardrobe_item_id, a as any])
    );

    const staleCutoff = Date.now() - STALE_PENDING_MIN * 60_000;
    const targets: string[] = [];
    for (const id of itemIds) {
      const a = byItem.get(id);
      if (!a) {
        if (includeMissing) targets.push(id);
        continue;
      }
      if (includeStatuses.includes(a.status)) {
        targets.push(id);
        continue;
      }
      if (
        a.status === 'pending' &&
        new Date(a.updated_at).getTime() < staleCutoff
      ) {
        targets.push(id);
      }
    }

    const queue = targets.slice(0, limit);

    // 3. Fire analyze function in parallel (best-effort, fire-and-forget)
    await Promise.allSettled(
      queue.map((id) =>
        fetch(`${SUPABASE_URL}/functions/v1/analyze-wardrobe-fashionclip`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SERVICE_ROLE}`,
            'x-trigger-secret': 'noop', // service role is sufficient for admin path; analyze() checks ownership when not trigger
          },
          body: JSON.stringify({ wardrobe_item_id: id, force: true, user_id: userId }),
        }).catch(() => null)
      )
    );

    console.log('[fashionclip-batch] queued', {
      user: userId,
      queued: queue.length,
      total: targets.length,
    });

    return new Response(
      JSON.stringify({ queued: queue.length, total: targets.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[fashionclip-batch] error', error?.message);
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
