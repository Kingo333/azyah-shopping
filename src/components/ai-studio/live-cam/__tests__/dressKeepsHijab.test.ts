import { describe, expect, it } from 'vitest';
import { buildTryOnInstruction, buildTryOnPrompt, tryOnCategory } from '../buildTryOnPrompt';

// Owner, 2026-11-11: a dress or abaya replaces the shopper's outfit, never her own hijab or head covering.
describe('dress prompts keep the shopper\'s own hijab', () => {
  const abaya = { category: 'modestwear', name: 'Black Embroidered Abaya', description: 'Long black abaya with gold piping.' };

  it('names the hijab in the compact FluxRT prompt for dresses only', () => {
    const dress = buildTryOnPrompt(abaya, { fluxrtPrompt: 'compact' });
    expect(dress).toContain('It is worn as a dress');
    expect(dress.endsWith("Keep the person's face, hair, hijab or head covering, body, pose and the background unchanged.")).toBe(true);
    const top = buildTryOnPrompt({ category: 'tops', name: 'White Tee' }, { fluxrtPrompt: 'compact' });
    expect(top.endsWith("Keep the person's face, hair, body, pose and the background unchanged.")).toBe(true);
    expect(top).not.toContain('hijab');
  });

  it('names the hijab in the long FluxRT prompt and the JoyAI instruction for dresses', () => {
    expect(buildTryOnPrompt({ category: 'dresses' })).toContain(
      "Preserve the person's own hijab or head covering exactly as it appears in the camera frame.",
    );
    expect(buildTryOnPrompt({ category: 'tops' })).not.toContain('hijab');
    expect(buildTryOnInstruction(abaya)).toContain(
      "Keep the person's face, hijab or head covering, body, pose and the background unchanged.",
    );
    expect(buildTryOnInstruction({ category: 'tops' })).toContain("Keep the person's face, body, pose and the background unchanged.");
  });

  it('gives the worker the same try-on type the prompt used', () => {
    expect(tryOnCategory(abaya)).toBe('dresses');
    expect(tryOnCategory({ category: 'abaya' })).toBe('dresses');
    expect(tryOnCategory({ category: 'dress' })).toBe('dresses');
    expect(tryOnCategory({ category: 'modestwear', name: 'Silk Hijab Scarf' })).toBe('accessories');
    expect(tryOnCategory({ category: 'top', name: 'Linen shirt' })).toBe('tops');
    expect(tryOnCategory({})).toBeNull();
  });
});
