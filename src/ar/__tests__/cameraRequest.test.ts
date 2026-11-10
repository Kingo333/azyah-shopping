import { describe, expect, it } from 'vitest';
import { buildConstraintChain } from '../core/CameraManager';

describe('buildConstraintChain', () => {
  it('keeps 1280x720 by default (AR) and uses the requested size and frame rate for Live Cam', () => {
    const def = buildConstraintChain('user')[0].constraints.video as MediaTrackConstraints;
    expect(def.width).toEqual({ ideal: 1280 });
    expect(def.frameRate).toBeUndefined();
    const live = buildConstraintChain('user', { width: 960, height: 540, frameRate: 15 })[0].constraints.video as MediaTrackConstraints;
    expect(live).toMatchObject({ width: { ideal: 960 }, height: { ideal: 540 }, frameRate: { ideal: 15 } });
  });
});
