import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_FAILS_PER_IP,
  MAX_FAILS_TOTAL,
  WINDOW_MS,
  clientIp,
  codesMatch,
  lockState,
  type Attempt,
} from '../../../supabase/functions/sales-demo-login/code';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/hooks/useLongPress', () => ({ useLongPress: () => ({}) }));

describe('sales code check (server)', () => {
  it('accepts only the exact code (spaces around it ignored)', async () => {
    expect(await codesMatch('246810', '246810')).toBe(true);
    expect(await codesMatch(' 246810 ', '246810')).toBe(true);
    expect(await codesMatch('246811', '246810')).toBe(false);
    expect(await codesMatch('46810', '246810')).toBe(false);
    expect(await codesMatch('246810', '')).toBe(false); // secret not set = sales mode off
  });

  it('locks a device after 5 wrong codes in 15 minutes, and everyone after 40', () => {
    const now = Date.parse('2026-11-08T12:00:00Z');
    const at = (msAgo: number, ip = 'a', ok = false): Attempt =>
      ({ ip_hash: ip, ok, created_at: new Date(now - msAgo).toISOString() });
    const four = Array.from({ length: MAX_FAILS_PER_IP - 1 }, () => at(60_000));
    expect(lockState(four, 'a', now)).toBe('open');
    expect(lockState([...four, at(60_000)], 'a', now)).toBe('locked');
    expect(lockState([...four, at(60_000)], 'b', now)).toBe('open'); // another device is not blocked
    expect(lockState([...four, at(WINDOW_MS + 1000)], 'a', now)).toBe('open'); // old tries expire
    expect(lockState([...four, at(60_000, 'a', true)], 'a', now)).toBe('open'); // right codes don't count
    const many = Array.from({ length: MAX_FAILS_TOTAL }, (_, i) => at(60_000, `ip${i}`));
    expect(lockState(many, 'new-device', now)).toBe('locked');
  });

  it('reads the caller IP from the first forwarded hop', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }))).toBe('1.2.3.4');
    expect(clientIp(new Headers({ 'cf-connecting-ip': '5.6.7.8' }))).toBe('5.6.7.8');
    expect(clientIp(new Headers())).toBe('unknown');
  });
});

describe('sales mode on the device', () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
    vi.stubGlobal('window', { dispatchEvent: () => true });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('is active until its end time, then expired; clearing turns it off', async () => {
    const { salesModeState, salesModeUserId, clearSalesMode } = await import('../salesMode');
    expect(salesModeState()).toBe('off');
    store.set('azyah_sales_mode', JSON.stringify({ until: 2_000, userId: 'demo' }));
    expect(salesModeState(1_000)).toBe('active');
    expect(salesModeState(2_000)).toBe('expired');
    expect(salesModeUserId()).toBe('demo');
    clearSalesMode();
    expect(salesModeState(1_000)).toBe('off');
  });

  it('treats broken stored data as off', async () => {
    const { salesModeState } = await import('../salesMode');
    store.set('azyah_sales_mode', '{not json');
    expect(salesModeState()).toBe('off');
  });
});

describe('locked page label', () => {
  it('names the feature the guest tried to open', async () => {
    const { lockedFeatureName } = await import('@/components/GuestLockedScreen');
    expect(lockedFeatureName('/wishlist')).toBe('your wishlist');
    expect(lockedFeatureName('/dress-me/wardrobe')).toBe('Dress Me');
    expect(lockedFeatureName('/settings')).toBe('Settings');
    expect(lockedFeatureName('/something-else')).toBe('this feature');
  });
});
