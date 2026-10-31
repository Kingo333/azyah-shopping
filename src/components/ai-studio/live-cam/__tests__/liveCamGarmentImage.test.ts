import { describe, expect, it } from 'vitest';
import { garmentTargetSize, prepareGarmentImage } from '../liveCamGarmentImage';

describe('garment photo clean-up', () => {
  it('caps the long side at 1024 and keeps the aspect ratio', () => {
    expect(garmentTargetSize(3000, 4000)).toEqual({ width: 768, height: 1024 });
    expect(garmentTargetSize(2048, 1024)).toEqual({ width: 1024, height: 512 });
  });
  it('never upscales small photos', () => {
    expect(garmentTargetSize(600, 800)).toEqual({ width: 600, height: 800 });
  });
  it('returns the original image when the browser canvas is unavailable', async () => {
    const blob = new Blob(['x'], { type: 'image/png' });
    expect(await prepareGarmentImage(blob)).toBe(blob);
  });
});
