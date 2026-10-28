import { describe, expect, it } from 'vitest';
import { statusTone } from './statusTone';

describe('statusTone', () => {
  it('maps live and approved states to ok', () => {
    for (const s of ['active', 'approved', 'published', 'live']) expect(statusTone(s)).toBe('ok');
  });
  it('maps pending states to wait', () => {
    for (const s of ['draft', 'pending', 'pending_review']) expect(statusTone(s)).toBe('wait');
  });
  it('maps rejected states to bad', () => {
    for (const s of ['rejected', 'declined']) expect(statusTone(s)).toBe('bad');
  });
  it('keeps everything else neutral', () => {
    for (const s of ['archived', 'inactive', 'out_of_stock', 'sold_out', '', 'unknown']) expect(statusTone(s)).toBe('neutral');
  });
});
