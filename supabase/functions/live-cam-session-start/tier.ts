// Pure helpers for Live Cam tiers. No Deno or Supabase imports, so the app's
// vitest suite can test them directly.

export type LiveCamTier = 'standard' | 'premium';
export type PremiumAccessMode = 'all' | 'premium_only' | 'off';

export const LIVE_CAM_TIERS: readonly LiveCamTier[] = ['standard', 'premium'];

/** Missing tier means standard. Anything other than the two tiers is invalid (null). */
export function parseTier(value: unknown): LiveCamTier | null {
  if (value === undefined || value === null) return 'standard';
  return value === 'standard' || value === 'premium' ? value : null;
}

/** Unknown or missing values become 'off' so Premium is blocked by default. */
export function parseAccessMode(value: string | undefined | null): PremiumAccessMode {
  const v = (value ?? '').trim().toLowerCase();
  return v === 'all' || v === 'premium_only' ? v : 'off';
}

export interface PremiumProfile {
  is_premium: boolean | null;
  premium_expires_at: string | null;
}

export function profileHasPremium(profile: PremiumProfile | null, now: Date = new Date()): boolean {
  if (!profile?.is_premium) return false;
  if (!profile.premium_expires_at) return true;
  const expires = new Date(profile.premium_expires_at);
  return !Number.isNaN(expires.getTime()) && expires > now;
}

export type PremiumAccessDecision =
  | { allowed: true }
  | { allowed: false; code: 'premium_disabled' | 'premium_required' };

/**
 * Decide whether a request for `tier` may proceed.
 * `loadProfile` is only called in premium_only mode.
 */
export async function decidePremiumAccess(
  tier: LiveCamTier,
  mode: PremiumAccessMode,
  loadProfile: () => Promise<PremiumProfile | null>,
): Promise<PremiumAccessDecision> {
  if (tier === 'standard') return { allowed: true };
  if (mode === 'all') return { allowed: true };
  if (mode === 'premium_only') {
    return profileHasPremium(await loadProfile())
      ? { allowed: true }
      : { allowed: false, code: 'premium_required' };
  }
  return { allowed: false, code: 'premium_disabled' };
}
