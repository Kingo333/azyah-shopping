import { describe, expect, it } from 'vitest';
import { isLiveCamLegacy, liveCamCameraSize, liveCamLite, liveCamPlaybackOverride, parseLiveCamCameraHeight, setLiveCamLite } from '../liveCamFlags';

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
  it('Normal (default) keeps today\'s camera request: no override', () => {
    expect(liveCamLite('', mem())).toBe(false);
    expect(liveCamCameraSize('', mem())).toBeNull();
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
    expect(liveCamCameraSize('?livecam_cam=360', mem())).toBeNull();
  });
});
