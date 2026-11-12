import { describe, expect, it } from 'vitest';
import { buildTryOnInstruction, buildTryOnPrompt } from '../buildTryOnPrompt';

// Owner, 12 Nov 2026: the same sentences as before, with "head covering," added for a dress or abaya,
// so the dress replaces the shopper's outfit, never what she wears on her head.
describe('dress prompts keep the shopper\'s head covering', () => {
  const abaya = { category: 'modestwear', name: 'Black Embroidered Abaya', description: 'Long black abaya with gold piping.' };

  it('FluxRT (compact prompt): adds "head covering," for dresses only', () => {
    const dress = buildTryOnPrompt(abaya, { fluxrtPrompt: 'compact' });
    expect(dress).toContain('It is worn as a dress');
    expect(dress.endsWith("Keep the person's face, hair, head covering, body, pose and the background unchanged.")).toBe(true);
    const top = buildTryOnPrompt({ category: 'tops', name: 'White Tee' }, { fluxrtPrompt: 'compact' });
    expect(top.endsWith("Keep the person's face, hair, body, pose and the background unchanged.")).toBe(true);
  });

  it('JoyAI (instruction): adds "head covering," for dresses only', () => {
    expect(buildTryOnInstruction(abaya).endsWith("Keep the person's face, head covering, body, pose and the background unchanged.")).toBe(true);
    expect(buildTryOnInstruction({ category: 'tops' }).endsWith("Keep the person's face, body, pose and the background unchanged.")).toBe(true);
  });

  it('the long dress prompt is back to its old text', () => {
    const long = buildTryOnPrompt({ category: 'dresses' });
    expect(long).toContain('Do not turn the dress into a top and skirt.');
    expect(long).not.toContain('head covering');
    expect(long).not.toContain('hijab');
  });
});
