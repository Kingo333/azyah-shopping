import { describe, expect, it } from 'vitest';
import {
  LIVE_CAM_TIER_CONFIG,
  applyEngineHints,
  coverCropRect,
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
  it('premium sends JoyAI-size frames', () => {
    expect(LIVE_CAM_TIER_CONFIG.premium.captureWidth).toBe(480);
    expect(LIVE_CAM_TIER_CONFIG.premium.captureHeight).toBe(840);
    expect(LIVE_CAM_TIER_CONFIG.premium.fpsCap).toBe(24);
    expect(LIVE_CAM_TIER_CONFIG.premium.jpegQuality).toBe(0.85);
    expect(LIVE_CAM_TIER_CONFIG.standard.captureWidth).toBe(288);
    expect(LIVE_CAM_TIER_CONFIG.standard.jpegQuality).toBe(0.7);
    expect(LIVE_CAM_TIER_CONFIG.premium.warmupTimeoutMs).toBe(300_000);
    expect(LIVE_CAM_TIER_CONFIG.premium.warmupLabel).toBe('Warming up Premium GPU… this can take a few minutes');
  });
});

describe('applyEngineHints', () => {
  const std = LIVE_CAM_TIER_CONFIG.standard;
  it('adopts JoyAI frame size, fps and quality from ready', () => {
    const cfg = applyEngineHints(std, {
      type: 'ready', engine: 'joyai', input_width: 480, input_height: 840, input_fps: 24, input_jpeg_quality: 0.85,
    });
    expect(cfg).toMatchObject({ captureWidth: 480, captureHeight: 840, fpsCap: 24, jpegQuality: 0.85 });
    expect(cfg.warmupTimeoutMs).toBe(std.warmupTimeoutMs);
  });
  it('keeps the tier config for FluxRT (no engine field)', () => {
    expect(applyEngineHints(std, { type: 'ready', session_deadline: 1 })).toBe(std);
  });
  it('ignores missing or out-of-range values', () => {
    const cfg = applyEngineHints(std, { engine: 'joyai', input_width: 99999, input_height: 840, input_fps: 0, input_jpeg_quality: 'x' });
    expect(cfg).toMatchObject({ captureWidth: 288, captureHeight: 512, fpsCap: 12, jpegQuality: 0.7 });
  });
});

describe('coverCropRect', () => {
  it('crops a landscape camera to a portrait frame without squeezing', () => {
    const r = coverCropRect(1280, 720, 480, 840);
    expect(r.sh).toBe(720);
    expect(r.sw).toBeCloseTo(720 * (480 / 840));
    expect(r.sx).toBeCloseTo((1280 - r.sw) / 2);
    expect(r.sy).toBe(0);
  });
  it('crops a taller camera top and bottom', () => {
    const r = coverCropRect(720, 1600, 480, 840);
    expect(r.sw).toBe(720);
    expect(r.sh).toBeCloseTo(720 / (480 / 840));
    expect(r.sy).toBeCloseTo((1600 - r.sh) / 2);
  });
  it('is a no-op crop when the aspect already matches', () => {
    expect(coverCropRect(720, 1260, 480, 840)).toEqual({ sx: 0, sy: 0, sw: 720, sh: 1260 });
  });
});
