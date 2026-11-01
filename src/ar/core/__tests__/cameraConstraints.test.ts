import { describe, expect, it } from 'vitest';
import { buildConstraintChain } from '../CameraManager';

describe('buildConstraintChain', () => {
  it('asks for the front camera by default', () => {
    const chain = buildConstraintChain();
    expect(chain.map((c) => c.tier)).toEqual(['ideal', 'fallback-720', 'fallback-basic']);
    for (const c of chain) expect((c.constraints.video as MediaTrackConstraints).facingMode).toBe('user');
  });
  it('asks for the back camera when flipped', () => {
    for (const c of buildConstraintChain('environment')) {
      expect((c.constraints.video as MediaTrackConstraints).facingMode).toBe('environment');
    }
  });
});
