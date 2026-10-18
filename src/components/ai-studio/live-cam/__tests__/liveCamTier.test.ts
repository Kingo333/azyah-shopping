import { describe, expect, it } from 'vitest';
import {
  LIVE_CAM_TIER_CONFIG,
  isPremiumUiEnabled,
  isPremiumUnavailable,
  readFunctionError,
} from '../liveCamTier';

describe('readFunctionError', () => {
  it('reads code and message from error.context (FunctionsHttpError)', async () => {
    const err = Object.assign(new Error('Edge Function returned a non-2xx status code'), {
      context: new Response(JSON.stringify({ error: 'Premium HD is coming soon.', code: 'premium_disabled' }), { status: 403 }),
    });
    expect(await readFunctionError(err)).toEqual({ code: 'premium_disabled', message: 'Premium HD is coming soon.' });
  });
  it('falls back to the error message when there is no body', async () => {
    expect(await readFunctionError(new Error('network'))).toEqual({ code: null, message: 'network' });
  });
  it('survives a non-JSON body', async () => {
    const err = Object.assign(new Error('boom'), { context: new Response('<html>', { status: 502 }) });
    expect(await readFunctionError(err)).toEqual({ code: null, message: 'boom' });
  });
});

describe('tier helpers', () => {
  it('premium unavailable codes', () => {
    expect(isPremiumUnavailable('premium_disabled')).toBe(true);
    expect(isPremiumUnavailable('premium_not_configured')).toBe(true);
    expect(isPremiumUnavailable('premium_required')).toBe(false);
    expect(isPremiumUnavailable(null)).toBe(false);
  });
  it('premium UI flag is on unless exactly false', () => {
    expect(isPremiumUiEnabled(undefined)).toBe(true);
    expect(isPremiumUiEnabled('true')).toBe(true);
    expect(isPremiumUiEnabled('false')).toBe(false);
    expect(isPremiumUiEnabled(' FALSE ')).toBe(false);
  });
  it('premium placeholders', () => {
    expect(LIVE_CAM_TIER_CONFIG.premium.captureWidth).toBe(LIVE_CAM_TIER_CONFIG.standard.captureWidth);
    expect(LIVE_CAM_TIER_CONFIG.premium.captureHeight).toBe(LIVE_CAM_TIER_CONFIG.standard.captureHeight);
    expect(LIVE_CAM_TIER_CONFIG.premium.warmupTimeoutMs).toBe(300_000);
    expect(LIVE_CAM_TIER_CONFIG.premium.warmupLabel).toBe('Warming up Premium GPU… this can take a few minutes');
  });
});
