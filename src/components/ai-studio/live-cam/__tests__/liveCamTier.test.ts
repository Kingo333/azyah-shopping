import { describe, expect, it } from 'vitest';
import {
  LIVE_CAM_CONFIG,
  LIVE_CAM_WARMUP_TIMEOUT_MS,
  applyEngineHints,
  coverCropRect,
  outputCanvasSize,
  readFunctionError,
  startFailureOutcome,
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

describe('one Live Try-On mode', () => {
  it('waits up to 15 minutes for any cold start (JoyAI or FluxRT)', () => {
    expect(LIVE_CAM_WARMUP_TIMEOUT_MS).toBe(15 * 60_000);
    expect(LIVE_CAM_CONFIG.warmupTimeoutMs).toBe(LIVE_CAM_WARMUP_TIMEOUT_MS);
    expect(LIVE_CAM_CONFIG.warmupLabel).toBe('Preparing your mirror… about 2–5 minutes the first time');
  });
  it('defaults to FluxRT model size until the worker sends its hints', () => {
    expect(LIVE_CAM_CONFIG).toMatchObject({ captureWidth: 288, captureHeight: 512, fpsCap: 12, jpegQuality: 0.7 });
  });
  it('takes JoyAI-size frames when the worker asks for them', () => {
    const cfg = applyEngineHints(LIVE_CAM_CONFIG, {
      engine: 'joyai', input_width: 480, input_height: 840, input_fps: 24, input_jpeg_quality: 0.85,
    });
    expect(cfg).toMatchObject({ captureWidth: 480, captureHeight: 840, fpsCap: 24, jpegQuality: 0.85 });
    expect(cfg.warmupTimeoutMs).toBe(LIVE_CAM_WARMUP_TIMEOUT_MS);
  });
});

describe('startFailureOutcome: cancel and timeout never show "aborted"', () => {
  it('a shopper cancelling while it starts ends quietly', () => {
    expect(startFailureOutcome('aborted', 'user')).toEqual({ status: 'ended', message: null });
  });
  it('a start timeout keeps its own message', () => {
    expect(startFailureOutcome('aborted', 'timeout')).toEqual({ status: 'failed', message: undefined });
  });
  it('real errors are shown', () => {
    expect(startFailureOutcome('Failed to start session', null)).toEqual({ status: 'failed', message: 'Failed to start session' });
    expect(startFailureOutcome('Camera blocked', 'user')).toEqual({ status: 'failed', message: 'Camera blocked' });
  });
});

describe('applyEngineHints: sharp input and playback hints (F1b/F2d)', () => {
  const std = LIVE_CAM_CONFIG;
  it('accepts a capture size larger than the default (FluxRT model size x2)', () => {
    const cfg = applyEngineHints(std, {
      engine: 'fluxrt', input_width: 576, input_height: 1024, output_width: 576, output_height: 1024,
      input_fps: 10, input_jpeg_quality: 0.8,
    });
    expect(cfg).toMatchObject({ captureWidth: 576, captureHeight: 1024, fpsCap: 10, jpegQuality: 0.8 });
    expect(outputCanvasSize(cfg)).toEqual({ width: 576, height: 1024 });
  });
  it('reads playback_buffer and playback_fps, and leaves them unset when absent', () => {
    expect(applyEngineHints(std, { engine: 'fluxrt' }).playbackBuffer).toBeUndefined();
    const on = applyEngineHints(std, { engine: 'fluxrt', playback_buffer: true, playback_fps: 24 });
    expect(on.playbackBuffer).toBe(true);
    expect(on.playbackFps).toBe(24);
    const off = applyEngineHints(std, { engine: 'joyai', playback_buffer: false, playback_fps: 999 });
    expect(off.playbackBuffer).toBe(false);
    expect(off.playbackFps).toBeUndefined();
    // A non-boolean hint counts as unset: for JoyAI that means the JoyAI default (on).
    expect(applyEngineHints(std, { engine: 'joyai', playback_buffer: 'yes' }).playbackBuffer).toBe(true);
    expect(applyEngineHints(std, { engine: 'fluxrt', playback_buffer: 'yes' }).playbackBuffer).toBeUndefined();
  });
  it('JoyAI: buffer on by default, at its own frame rate, two chunks max, one chunk held', () => {
    const j = applyEngineHints(std, { engine: 'joyai', input_width: 480, input_height: 840, input_fps: 24, input_jpeg_quality: 0.85 });
    expect(j).toMatchObject({ playbackBuffer: true, playbackFps: 24, playbackMaxBuffer: 16, playbackTargetBuffer: 8, captureWidth: 480 });
    expect(applyEngineHints(std, { engine: 'joyai' }).playbackFps).toBe(24);
    // The worker can still turn it off, and FluxRT is unchanged (off unless hinted).
    expect(applyEngineHints(std, { engine: 'joyai', playback_buffer: false }).playbackBuffer).toBe(false);
    expect(applyEngineHints(std, { engine: 'fluxrt' }).playbackMaxBuffer).toBeUndefined();
  });
});

describe('applyEngineHints', () => {
  const std = LIVE_CAM_CONFIG;
  it('adopts JoyAI frame size, fps and quality from ready', () => {
    const cfg = applyEngineHints(std, {
      type: 'ready', engine: 'joyai', input_width: 480, input_height: 840, input_fps: 24, input_jpeg_quality: 0.85,
    });
    expect(cfg).toMatchObject({ captureWidth: 480, captureHeight: 840, fpsCap: 24, jpegQuality: 0.85 });
    expect(cfg.warmupTimeoutMs).toBe(std.warmupTimeoutMs);
  });
  it('keeps the tier config for older workers (no engine field)', () => {
    expect(applyEngineHints(std, { type: 'ready', session_deadline: 1 })).toBe(std);
  });
  it('adopts FluxRT hints including the 2x output size', () => {
    const cfg = applyEngineHints(std, {
      type: 'ready', engine: 'fluxrt', input_width: 288, input_height: 512,
      output_width: 576, output_height: 1024, input_fps: 10, input_jpeg_quality: 0.8,
    });
    expect(cfg).toMatchObject({ captureWidth: 288, captureHeight: 512, fpsCap: 10, jpegQuality: 0.8 });
    expect(outputCanvasSize(cfg)).toEqual({ width: 576, height: 1024 });
  });
  it('output canvas falls back to the capture size', () => {
    expect(outputCanvasSize(std)).toEqual({ width: 288, height: 512 });
    const cfg = applyEngineHints(std, { engine: 'fluxrt', output_width: 99999, output_height: 1024 });
    expect(outputCanvasSize(cfg)).toEqual({ width: 288, height: 512 });
  });
  it('ignores unknown engines', () => {
    expect(applyEngineHints(std, { engine: 'other', input_width: 480, input_height: 840 })).toBe(std);
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
