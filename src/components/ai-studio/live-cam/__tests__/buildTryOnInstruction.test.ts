import { describe, expect, it } from 'vitest';
import { buildTryOnInstruction } from '../buildTryOnPrompt';

describe('buildTryOnInstruction', () => {
  it('uses Lucy-style substitute phrasing per category', () => {
    expect(buildTryOnInstruction({ category: 'T-Shirts' })).toMatch(/^Substitute the current top with the garment in the reference image\./);
    expect(buildTryOnInstruction({ category: 'jeans' })).toMatch(/^Substitute the current pants or skirt/);
    expect(buildTryOnInstruction({ category: 'abaya' })).toMatch(/^Substitute the current outfit with the dress/);
    expect(buildTryOnInstruction({ category: 'sneakers' })).toMatch(/^Substitute the current shoes/);
  });
  it('falls back to the item name, then a generic instruction', () => {
    expect(buildTryOnInstruction({ category: null, name: 'Linen blazer' })).toMatch(/^Put the outerwear/);
    expect(buildTryOnInstruction({})).toMatch(/^Substitute the matching clothing item/);
  });
  it('always asks to keep the person and background', () => {
    expect(buildTryOnInstruction({ category: 'tops' })).toContain("Keep the person's face, body, pose and the background unchanged.");
  });
});
