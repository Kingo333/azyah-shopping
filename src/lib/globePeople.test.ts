import { describe, expect, it } from 'vitest';
import { toCountryCodeCounts } from './globePeople';

const toCode = (name: string) => ({ 'United Arab Emirates': 'AE', UAE: 'AE', France: 'FR' } as Record<string, string>)[name] ?? null;

describe('toCountryCodeCounts', () => {
  it('turns country names into globe pins with counts', () => {
    expect(toCountryCodeCounts([{ country: 'United Arab Emirates', people: 3 }, { country: 'France', people: 1 }], toCode))
      .toEqual([{ code: 'AE', count: 3 }, { code: 'FR', count: 1 }]);
  });
  it('adds up names that mean the same country', () => {
    expect(toCountryCodeCounts([{ country: 'United Arab Emirates', people: 2 }, { country: 'UAE', people: 1 }], toCode))
      .toEqual([{ code: 'AE', count: 3 }]);
  });
  it('puts people with no or unknown country on the global pin', () => {
    expect(toCountryCodeCounts([{ country: null, people: 2 }, { country: 'Atlantis', people: 1 }, { country: 'France', people: 4 }], toCode))
      .toEqual([{ code: 'FR', count: 4 }, { code: 'GLOBAL', count: 3 }]);
  });
  it('ignores empty rows', () => {
    expect(toCountryCodeCounts([{ country: 'France', people: 0 }], toCode)).toEqual([]);
    expect(toCountryCodeCounts([], toCode)).toEqual([]);
  });
});
