/**
 * Sales mode: for showing the app to retailers from a guest screen.
 *
 * A guest long-presses the title of the "Create an Account" popup, types the sales code, and the
 * server (edge function sales-demo-login) checks it and signs this device in to the shared
 * "Azyah Sales Demo" shopper account, so the try-ons work. The code is never in the app.
 * Sales mode ends after 12 hours or with "Exit" on the sales badge; the device goes back to guest.
 */
import { supabase } from '@/integrations/supabase/client';
import { readFunctionError } from '@/components/ai-studio/live-cam/liveCamTier';

const SALES_KEY = 'azyah_sales_mode';
export const SALES_CHANGED_EVENT = 'azyah-sales-mode-changed';

export interface SalesUnlockResult {
  ok: boolean;
  reason?: 'wrong_code' | 'locked' | 'off' | 'failed';
  /** What to show the person when ok is false. */
  message?: string;
}

interface SalesState {
  until: number;
  userId: string | null;
}

const read = (): SalesState | null => {
  try {
    const raw = localStorage.getItem(SALES_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return typeof v?.until === 'number' ? { until: v.until, userId: typeof v.userId === 'string' ? v.userId : null } : null;
  } catch {
    return null;
  }
};

const notify = () => {
  try {
    window.dispatchEvent(new Event(SALES_CHANGED_EVENT));
  } catch {
    /* no window (tests) */
  }
};

/** Is this device in sales mode right now (and not past its end time)? */
export const salesModeState = (now = Date.now()): 'off' | 'active' | 'expired' => {
  const s = read();
  if (!s) return 'off';
  return now < s.until ? 'active' : 'expired';
};

/** The demo account's user id recorded at unlock, or null. */
export const salesModeUserId = (): string | null => read()?.userId ?? null;

/** When sales mode ends on this device (ms since epoch), or null. */
export const salesModeEndsAt = (): number | null => read()?.until ?? null;

export const clearSalesMode = () => {
  try {
    localStorage.removeItem(SALES_KEY);
  } catch {
    /* storage blocked */
  }
  notify();
};

const MESSAGES: Record<string, string> = {
  wrong_code: 'That code is not right.',
  locked: 'Too many wrong codes. Try again in 15 minutes.',
  sales_off: 'Sales mode is not available right now.',
};

/** Sends the code to the server; on success this device is signed in to the sales demo account. */
export async function unlockSales(code: string): Promise<SalesUnlockResult> {
  const { data, error } = await supabase.functions.invoke<{
    access_token: string; refresh_token: string; sales_until: number;
  }>('sales-demo-login', { body: { code } });
  if (error || !data?.access_token || !data?.refresh_token) {
    const d = error ? await readFunctionError(error) : { code: null, message: null };
    const reason = d.code === 'wrong_code' ? 'wrong_code' : d.code === 'locked' ? 'locked'
      : d.code === 'sales_off' ? 'off' : 'failed';
    return { ok: false, reason, message: MESSAGES[d.code ?? ''] ?? 'Could not open sales mode. Check the connection and try again.' };
  }
  const { data: set, error: setErr } = await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });
  if (setErr || !set.session) {
    return { ok: false, reason: 'failed', message: 'Could not open sales mode. Try again.' };
  }
  try {
    localStorage.setItem(SALES_KEY, JSON.stringify({ until: data.sales_until, userId: set.session.user.id }));
  } catch {
    /* storage blocked: sales mode still works until the app is closed */
  }
  notify();
  return { ok: true };
}
