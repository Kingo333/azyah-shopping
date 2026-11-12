import { describe, expect, it } from 'vitest';
import { LIVE_CAM_CAMERA_MAX_LONG_SIDE, LIVE_CAM_LITE_DEFAULT, isLiveCamLegacy, liveCamCameraSize, liveCamEncoderMode, liveCamLite, liveCamNewFramesOnly, liveCamPlaybackOverride, parseLiveCamCameraHeight, setLiveCamLite } from '../liveCamFlags';

describe('buffered playback override (F1b)', () => {
  it('URL param beats localStorage; 1 = on, 0 = off, anything else = no override', () => {
    expect(liveCamPlaybackOverride('?livecam_playback=1', { getItem: () => '0' })).toBe('on');
    expect(liveCamPlaybackOverride('?livecam_playback=0', { getItem: () => '1' })).toBe('off');
    expect(liveCamPlaybackOverride('?x=1', { getItem: () => '1' })).toBe('on');
    expect(liveCamPlaybackOverride('', { getItem: () => '0' })).toBe('off');
    expect(liveCamPlaybackOverride('', { getItem: () => null })).toBeNull();
    expect(liveCamPlaybackOverride(undefined, undefined)).toBeNull();
    expect(liveCamPlaybackOverride('', { getItem: () => { throw new Error('private mode'); } })).toBeNull();
  });
});
import { buildTryOnInstruction } from '../buildTryOnPrompt';

describe('legacy benchmark switch', () => {
  it('is on with ?livecam_legacy=1 or the localStorage key, off otherwise', () => {
    expect(isLiveCamLegacy('?livecam_legacy=1', undefined)).toBe(true);
    expect(isLiveCamLegacy('?x=1', { getItem: () => '1' })).toBe(true);
    expect(isLiveCamLegacy('', { getItem: () => null })).toBe(false);
    expect(isLiveCamLegacy(undefined, undefined)).toBe(false);
  });
  it('drops the Gemini details from the instruction in legacy mode', () => {
    const hint = 'Replace only the upper body. Navy tee with white logo.';
    expect(buildTryOnInstruction({ category: 'tops', name: 'Tee', promptHint: hint })).toContain('Navy tee');
    expect(buildTryOnInstruction({ category: 'tops', name: 'Tee', promptHint: hint }, { useHintDetails: false })).toBe(
      "Substitute the current top with the garment in the reference image. The reference garment is the Tee. " +
        "Match its exact color, pattern, print, logo, fabric and construction details. Keep the person's face, body, pose and the background unchanged.",
    );
  });
});

describe('Live Cam camera size and Lite mode', () => {
  const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };
  it('Lite is the default for now; tapping Normal is remembered and keeps today\'s camera request', () => {
    expect(liveCamLite('', mem())).toBe(LIVE_CAM_LITE_DEFAULT);
    const s = mem();
    setLiveCamLite(false, s);
    expect(liveCamLite('', s)).toBe(false);
    expect(liveCamCameraSize('', s)).toBeNull();
  });
  it('Lite asks for 960x540, never below the 288x512 model input; remembered; ?livecam_cam= wins', () => {
    const s = mem();
    setLiveCamLite(true, s);
    expect(liveCamLite('', s)).toBe(true);
    expect(liveCamCameraSize('', s)).toEqual({ width: 960, height: 540 });
    const lite720 = mem(); setLiveCamLite(true, lite720);
    expect(liveCamCameraSize('?livecam_cam=720', lite720)).toEqual({ width: 1280, height: 720 });
    setLiveCamLite(false, s);
    expect(liveCamCameraSize('', s)).toBeNull();
  });
  it('?livecam_cam= only accepts sizes at or above the model input', () => {
    expect(parseLiveCamCameraHeight('540')).toBe(540);
    expect(parseLiveCamCameraHeight('360')).toBeNull();
    expect(parseLiveCamCameraHeight('480')).toBeNull();
    const normal = mem(); setLiveCamLite(false, normal);
    expect(liveCamCameraSize('?livecam_cam=360', normal)).toBeNull();
  });
});


describe('kiosk speed switches', () => {
  const mem = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
  };
  it('encodes in a worker by default; ?livecam_encoder=main goes back and is remembered', () => {
    const st = mem();
    expect(liveCamEncoderMode('', st)).toBe('worker');
    expect(liveCamEncoderMode('?livecam_encoder=main', st)).toBe('main');
    expect(liveCamEncoderMode('', st)).toBe('main');
    expect(liveCamEncoderMode('?livecam_encoder=worker', st)).toBe('worker');
  });
  it('sends new camera frames only by default; ?livecam_newframes=0 turns it off', () => {
    const st = mem();
    expect(liveCamNewFramesOnly('', st)).toBe(true);
    expect(liveCamNewFramesOnly('?livecam_newframes=0', st)).toBe(false);
    expect(liveCamNewFramesOnly('', st)).toBe(false);
    expect(liveCamNewFramesOnly('?livecam_newframes=1', st)).toBe(true);
  });
  it('caps the camera at 720p class and keeps Lite as it was', () => {
    expect(LIVE_CAM_CAMERA_MAX_LONG_SIDE).toBe(1280);
    expect(typeof LIVE_CAM_LITE_DEFAULT).toBe('boolean');
  });
});
