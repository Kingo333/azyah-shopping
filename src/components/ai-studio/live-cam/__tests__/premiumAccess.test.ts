import { describe, expect, it, vi } from 'vitest';
import {
  decidePremiumAccess,
  parseAccessMode,
  parseTier,
  profileHasPremium,
} from '../../../../../supabase/functions/live-cam-session-start/tier';

describe('parseTier', () => {
  it('defaults to standard when missing', () => {
    expect(parseTier(undefined)).toBe('standard');
    expect(parseTier(null)).toBe('standard');
  });
  it('accepts the two tiers', () => {
    expect(parseTier('standard')).toBe('standard');
    expect(parseTier('premium')).toBe('premium');
  });
  it('rejects anything else', () => {
    for (const v of ['', 'Premium', 'gold', 1, {}, true]) expect(parseTier(v)).toBeNull();
  });
});

describe('parseAccessMode', () => {
  it('reads known modes', () => {
    expect(parseAccessMode('all')).toBe('all');
    expect(parseAccessMode(' PREMIUM_ONLY ')).toBe('premium_only');
    expect(parseAccessMode('off')).toBe('off');
  });
  it('treats unknown or missing as off', () => {
    for (const v of [undefined, null, '', 'yes', 'true', 'everyone']) expect(parseAccessMode(v)).toBe('off');
  });
});

describe('profileHasPremium', () => {
  const now = new Date('2026-10-18T00:00:00Z');
  it('needs is_premium', () => {
    expect(profileHasPremium(null, now)).toBe(false);
    expect(profileHasPremium({ is_premium: false, premium_expires_at: null }, now)).toBe(false);
  });
  it('respects expiry', () => {
    expect(profileHasPremium({ is_premium: true, premium_expires_at: null }, now)).toBe(true);
    expect(profileHasPremium({ is_premium: true, premium_expires_at: '2027-01-01T00:00:00Z' }, now)).toBe(true);
    expect(profileHasPremium({ is_premium: true, premium_expires_at: '2026-01-01T00:00:00Z' }, now)).toBe(false);
    expect(profileHasPremium({ is_premium: true, premium_expires_at: 'garbage' }, now)).toBe(false);
  });
});

describe('decidePremiumAccess', () => {
  const premium = async () => ({ is_premium: true, premium_expires_at: null });
  const free = async () => ({ is_premium: false, premium_expires_at: null });

  it('always allows standard without loading the profile', async () => {
    const load = vi.fn(free);
    for (const mode of ['all', 'premium_only', 'off'] as const) {
      expect(await decidePremiumAccess('standard', mode, load)).toEqual({ allowed: true });
    }
    expect(load).not.toHaveBeenCalled();
  });
  it('all: everyone gets premium', async () => {
    expect(await decidePremiumAccess('premium', 'all', free)).toEqual({ allowed: true });
  });
  it('premium_only: checks the profile', async () => {
    expect(await decidePremiumAccess('premium', 'premium_only', premium)).toEqual({ allowed: true });
    expect(await decidePremiumAccess('premium', 'premium_only', free)).toEqual({ allowed: false, code: 'premium_required' });
    expect(await decidePremiumAccess('premium', 'premium_only', async () => null)).toEqual({ allowed: false, code: 'premium_required' });
  });
  it('off (and unknown values) blocks premium', async () => {
    expect(await decidePremiumAccess('premium', 'off', premium)).toEqual({ allowed: false, code: 'premium_disabled' });
    expect(await decidePremiumAccess('premium', parseAccessMode('typo'), premium)).toEqual({ allowed: false, code: 'premium_disabled' });
  });
});
