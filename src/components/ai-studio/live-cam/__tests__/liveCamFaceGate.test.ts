import { describe, expect, it } from 'vitest';
import { needsFaceGate } from '../liveCamFaceGate';

describe('needsFaceGate', () => {
  it('keeps the face check for tops and dresses on the front camera', () => {
    expect(needsFaceGate('Tops', 'user')).toBe(true);
    expect(needsFaceGate('dress', 'user')).toBe(true);
    expect(needsFaceGate(null, 'user')).toBe(true);
  });
  it('turns it off for shoes and bottoms', () => {
    expect(needsFaceGate('Sneakers', 'user')).toBe(false);
    expect(needsFaceGate('shoes', 'user')).toBe(false);
    expect(needsFaceGate('jeans', 'user')).toBe(false);
  });
  it('turns it off on the back camera', () => {
    expect(needsFaceGate('tops', 'environment')).toBe(false);
  });
});
