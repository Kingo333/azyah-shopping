import { describe, expect, it } from 'vitest';
import { GarmentRefCache } from '../liveCamGarmentCache';

describe('GarmentRefCache', () => {
  it('returns cached refs and evicts the least recently used', () => {
    const c = new GarmentRefCache(2);
    c.set('a', 'A');
    c.set('b', 'B');
    expect(c.get('a')).toBe('A'); // a is now most recent
    c.set('c', 'C'); // evicts b
    expect(c.get('b')).toBeUndefined();
    expect(c.get('a')).toBe('A');
    expect(c.get('c')).toBe('C');
    expect(c.size).toBe(2);
  });
});
