// Sales mode: a guest types the sales code; if it is right, the device is signed in to the shared
// "Azyah Sales Demo" shopper account so the try-ons work during a retailer demo.
// - The code lives only in the SALES_DEMO_CODE secret (never in the app). Unset = sales mode off.
// - Wrong codes are rate limited (5 per device, 40 overall, per 15 minutes; table sales_unlock_attempts).
// - The demo account (SALES_DEMO_EMAIL, default sales-demo@azyahstyle.com) is created on first use as a
//   normal shopper with no password; each unlock gets a fresh session from a one-time magic link that is
//   used right here and never emailed.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { SALES_HOURS, clientIp, codesMatch, lockState, sha256Hex, type Attempt } from './code.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed', code: 'method' }, 405);

  const expected = Deno.env.get('SALES_DEMO_CODE') ?? '';
  if (!expected) return json({ error: 'Sales mode is switched off', code: 'sales_off' }, 503);

  let typed = '';
  try {
    const body = await req.json();
    typed = typeof body?.code === 'string' ? body.code : '';
  } catch {
    return json({ error: 'Bad request', code: 'bad_request' }, 400);
  }
  if (!typed || typed.length > 32) return json({ error: 'Wrong code', code: 'wrong_code' }, 401);

  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const ipHash = await sha256Hex(`sales:${clientIp(req.headers)}`);

  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data: recent, error: readErr } = await admin
    .from('sales_unlock_attempts')
    .select('ip_hash, ok, created_at')
    .eq('ok', false)
    .gte('created_at', since)
    .limit(500);
  if (readErr) {
    console.error('sales-demo-login: attempts table not readable', readErr.message);
    return json({ error: 'Sales mode is not set up yet', code: 'sales_off' }, 503);
  }
  if (lockState((recent ?? []) as Attempt[], ipHash, Date.now()) === 'locked') {
    return json({ error: 'Too many wrong codes. Try again in 15 minutes.', code: 'locked' }, 429);
  }

  const ok = await codesMatch(typed, expected);
  await admin.from('sales_unlock_attempts').insert({ ip_hash: ipHash, ok });
  if (!ok) return json({ error: 'Wrong code', code: 'wrong_code' }, 401);

  const email = Deno.env.get('SALES_DEMO_EMAIL') ?? 'sales-demo@azyahstyle.com';
  // First use creates the account (the signup triggers make it a normal shopper); later calls
  // get "already registered", which is fine.
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { role: 'shopper', name: 'Azyah Sales Demo', sales_demo: true },
  });
  if (created.error && !/already|registered|exists/i.test(created.error.message)) {
    console.error('sales-demo-login: demo account not created', created.error.message);
    return json({ error: 'Could not open sales mode', code: 'demo_account' }, 500);
  }

  const link = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  const tokenHash = link.data?.properties?.hashed_token;
  if (link.error || !tokenHash) {
    console.error('sales-demo-login: link not generated', link.error?.message);
    return json({ error: 'Could not open sales mode', code: 'demo_session' }, 500);
  }
  const anon = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: verified, error: verifyErr } = await anon.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
  const session = verified?.session;
  if (verifyErr || !session) {
    console.error('sales-demo-login: session not created', verifyErr?.message);
    return json({ error: 'Could not open sales mode', code: 'demo_session' }, 500);
  }

  return json({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    sales_until: Date.now() + SALES_HOURS * 60 * 60 * 1000,
  });
});
