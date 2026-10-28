import { describe, expect, it } from 'vitest';
import { v3Defaults } from './v3Classes';

const card = [
  { when: ['rounded'], add: 'v3:rounded-[20px]' },
  { when: ['border'], add: 'v3:border-transparent' },
  { when: ['shadow'], add: 'v3:shadow-none' },
];

describe('v3Defaults', () => {
  it('adds every default when the caller sets nothing', () => {
    expect(v3Defaults(undefined, card)).toBe('v3:rounded-[20px] v3:border-transparent v3:shadow-none');
    expect(v3Defaults('p-4 bg-white', card)).toBe('v3:rounded-[20px] v3:border-transparent v3:shadow-none');
  });
  it('skips a default the caller already sets', () => {
    expect(v3Defaults('rounded-full', card)).toBe('v3:border-transparent v3:shadow-none');
    expect(v3Defaults('border-2 border-primary shadow-lg', card)).toBe('v3:rounded-[20px]');
  });
  it('looks through variants and the important mark', () => {
    expect(v3Defaults('md:rounded-xl hover:!shadow-md', card)).toBe('v3:border-transparent');
  });
  it('matches a full-token prefix with variants', () => {
    const rules = [{ when: ['data-[state=active]:bg-'], add: 'v3:data-[state=active]:bg-card' }];
    expect(v3Defaults('data-[state=active]:bg-primary', rules)).toBe('');
    expect(v3Defaults('bg-primary', rules)).toBe('v3:data-[state=active]:bg-card');
  });
  it('does not confuse similar names', () => {
    // "rounded" must not match "round-trip" style words that are not utilities
    expect(v3Defaults('roundedness', [{ when: ['rounded-'], add: 'x' }])).toBe('x');
  });
});
