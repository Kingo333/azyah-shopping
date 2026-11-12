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

describe('buildConstraintChain with a size cap (kiosk speed work)', () => {
  it('asks for at most maxLongSide first, then falls back to the plain request', () => {
    const chain = buildConstraintChain('user', { width: 1280, height: 720, maxLongSide: 1280 });
    expect(chain.map((c) => c.tier)).toEqual(['ideal-capped', 'ideal', 'fallback-720', 'fallback-basic']);
    expect(chain[0].constraints.video).toMatchObject({ width: { ideal: 1280, max: 1280 }, height: { ideal: 720, max: 1280 } });
    expect(chain[1].constraints.video).toMatchObject({ width: { ideal: 1280 }, height: { ideal: 720 } });
    expect((chain[1].constraints.video as MediaTrackConstraints).width).toEqual({ ideal: 1280 });
  });

  it('is unchanged without a cap (AR)', () => {
    expect(buildConstraintChain('user').map((c) => c.tier)).toEqual(['ideal', 'fallback-720', 'fallback-basic']);
  });
});
