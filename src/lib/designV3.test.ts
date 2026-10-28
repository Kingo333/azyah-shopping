import { describe, expect, it } from 'vitest';
import { DESIGN_V3_CLASS, DESIGN_V3_STORAGE_KEY, keepsOriginalLook, resolveDesignV3 } from './designV3';
import { features } from './features';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => { data[k] = v; },
    removeItem: (k: string) => { delete data[k]; },
  };
}

const broken = {
  getItem: () => { throw new Error('blocked'); },
  setItem: () => { throw new Error('blocked'); },
  removeItem: () => { throw new Error('blocked'); },
};

describe('resolveDesignV3', () => {
  it('enables design v3 for everyone without a query or saved opt-in', () => {
    expect(features.design_v3).toBe(true);
    expect(resolveDesignV3('', memoryStorage(), features.design_v3)).toBe(true);
    expect(resolveDesignV3('', null, features.design_v3)).toBe(true);
  });
  it('uses the names the app relies on', () => {
    expect(DESIGN_V3_STORAGE_KEY).toBe('azyah:design_v3');
    expect(DESIGN_V3_CLASS).toBe('design-v3');
  });
  it('is off by default', () => {
    expect(resolveDesignV3('', memoryStorage(), false)).toBe(false);
  });
  it('turns on with ?design=v3 and remembers it on this device', () => {
    const s = memoryStorage();
    expect(resolveDesignV3('?design=v3', s, false)).toBe(true);
    expect(s.data[DESIGN_V3_STORAGE_KEY]).toBe('1');
    expect(resolveDesignV3('', s, false)).toBe(true);
  });
  it('turns off with ?design=v2 and forgets it', () => {
    const s = memoryStorage({ [DESIGN_V3_STORAGE_KEY]: '1' });
    expect(resolveDesignV3('?design=v2', s, false)).toBe(false);
    expect(s.data[DESIGN_V3_STORAGE_KEY]).toBeUndefined();
    expect(resolveDesignV3('', s, false)).toBe(false);
  });
  it('ignores other values of the param', () => {
    const s = memoryStorage({ [DESIGN_V3_STORAGE_KEY]: '1' });
    expect(resolveDesignV3('?design=x', s, false)).toBe(true);
    expect(resolveDesignV3('?design=x', memoryStorage(), false)).toBe(false);
  });
  it('follows the default when nothing is stored', () => {
    expect(resolveDesignV3('', memoryStorage(), true)).toBe(true);
    expect(resolveDesignV3('', null, true)).toBe(true);
  });
  it('still applies the param when storage throws', () => {
    expect(resolveDesignV3('?design=v3', broken, false)).toBe(true);
    expect(resolveDesignV3('?design=v2', broken, true)).toBe(false);
    expect(resolveDesignV3('', broken, false)).toBe(false);
    expect(resolveDesignV3('', null, false)).toBe(false);
  });
});

describe('keepsOriginalLook', () => {
  it('keeps the original home pages', () => {
    for (const p of ['/', '/landing', '/onboarding/intro']) expect(keepsOriginalLook(p)).toBe(true);
  });
  it('uses design v3 everywhere else', () => {
    for (const p of ['/swipe', '/explore', '/profile', '/onboarding/signup', '/landing-x', '/landing/more']) {
      expect(keepsOriginalLook(p)).toBe(false);
    }
  });
});
