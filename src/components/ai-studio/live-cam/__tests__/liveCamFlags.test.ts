import { describe, expect, it } from 'vitest';
import { isLiveCamLegacy, liveCamPlaybackOverride } from '../liveCamFlags';

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
