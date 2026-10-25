import { describe, expect, it } from 'vitest';
import { buildTryOnInstruction, cleanProductText } from '../buildTryOnPrompt';

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
  it('adds the product name and description so JoyAI sees the garment details', () => {
    const s = buildTryOnInstruction({
      category: 'tops',
      name: 'Striped linen shirt',
      description: 'Navy and white vertical stripes, mandarin collar, two chest pockets',
    });
    expect(s).toBe(
      'Substitute the current top with the garment in the reference image. ' +
        'The reference garment is the Striped linen shirt: Navy and white vertical stripes, mandarin collar, two chest pockets. ' +
        'Match its exact color, pattern, print, logo, fabric and construction details. ' +
        "Keep the person's face, body, pose and the background unchanged.",
    );
  });
  it('keeps the short form when there is no name or description', () => {
    expect(buildTryOnInstruction({ category: 'tops' })).toBe(
      "Substitute the current top with the garment in the reference image. Keep the person's face, body, pose and the background unchanged.",
    );
  });
});

describe('cleanProductText', () => {
  it('strips HTML, URLs and line breaks', () => {
    expect(cleanProductText('<p>Soft cotton</p>\n<br/>See https://x.example/a?b=1 now')).toBe('Soft cotton See now');
  });
  it('caps long text at a word boundary', () => {
    const out = cleanProductText('word '.repeat(200), 50);
    expect(out.length).toBeLessThanOrEqual(50);
    expect(out.endsWith('word')).toBe(true);
  });
  it('handles empty input', () => {
    expect(cleanProductText(null)).toBe('');
    expect(cleanProductText('   ')).toBe('');
  });
});
