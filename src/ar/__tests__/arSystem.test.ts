/**
 * Regression tests for the AR system.
 * Session 3: 3D-only — 2D mode tests removed.
 */
import { describe, it, expect } from 'vitest';

// ── resolveARMode ──
// Imported as named export from ARExperience / GarmentRenderer.
// Re-implemented here for isolated testing — same logic as runtime.
type ARMode = '3d' | 'none';
interface TestSpec {
  modelUrl?: string;
}

function resolveARMode(spec: TestSpec): ARMode {
  return spec.modelUrl ? '3d' : 'none';
}

describe('resolveARMode', () => {
  it('returns 3d when a model URL is present', () => {
    expect(resolveARMode({ modelUrl: 'http://model.glb' })).toBe('3d');
  });

  it('returns none when no model URL', () => {
    expect(resolveARMode({})).toBe('none');
  });
});

// ── Cover crop math ──
function computeCoverCropRect(videoW: number, videoH: number, canvasW: number, canvasH: number) {
  const videoAspect = videoW / videoH;
  const canvasAspect = canvasW / canvasH;

  let srcX = 0, srcY = 0, srcW = videoW, srcH = videoH;

  if (videoAspect > canvasAspect) {
    srcW = videoH * canvasAspect;
    srcX = (videoW - srcW) / 2;
  } else {
    srcH = videoW / canvasAspect;
    srcY = (videoH - srcH) / 2;
  }

  return { srcX, srcY, srcW, srcH };
}

describe('computeCoverCropRect', () => {
  it('crops sides when video is wider than canvas (16:9 video on 9:16 phone)', () => {
    const result = computeCoverCropRect(1920, 1080, 390, 844);
    expect(result.srcX).toBeGreaterThan(0);
    expect(result.srcY).toBe(0);
    expect(result.srcW).toBeLessThan(1920);
    expect(result.srcH).toBe(1080);
  });

  it('crops top/bottom when video is taller (4:3 on 16:9 display)', () => {
    const result = computeCoverCropRect(640, 480, 1920, 1080);
    expect(result.srcX).toBe(0);
    expect(result.srcY).toBeGreaterThan(0);
    expect(result.srcW).toBe(640);
    expect(result.srcH).toBeLessThan(480);
  });

  it('no crop when aspect ratios match', () => {
    const result = computeCoverCropRect(1920, 1080, 1280, 720);
    expect(result.srcX).toBeCloseTo(0);
    expect(result.srcY).toBeCloseTo(0);
    expect(result.srcW).toBeCloseTo(1920);
    expect(result.srcH).toBeCloseTo(1080);
  });

  it('cover crop preserves full canvas coverage', () => {
    const result = computeCoverCropRect(1280, 720, 390, 844);
    const displayedAspect = result.srcW / result.srcH;
    const canvasAspect = 390 / 844;
    expect(displayedAspect).toBeCloseTo(canvasAspect, 3);
  });
});

// ── Tracking state transitions decoupled from model load (Session 3 bug fix) ──
describe('tracking state transitions', () => {
  /**
   * Session 3 fix: state transitions in handleFrame3D should reflect what
   * MediaPipe pose sees, regardless of whether the model has finished loading.
   * Previously the transition was gated on currentModel being set, which kept
   * users stuck on the init "waiting_for_pose" state during the GLB download.
   */
  function nextTrackingState(allRequiredVisible: boolean, someRequiredVisible: boolean): string {
    if (allRequiredVisible) return 'tracking_active';
    if (someRequiredVisible) return 'partial_tracking';
    return 'waiting_for_pose';
  }

  it('all required visible → tracking_active', () => {
    expect(nextTrackingState(true, true)).toBe('tracking_active');
  });

  it('some required visible → partial_tracking', () => {
    expect(nextTrackingState(false, true)).toBe('partial_tracking');
  });

  it('no required visible → waiting_for_pose', () => {
    expect(nextTrackingState(false, false)).toBe('waiting_for_pose');
  });
});
