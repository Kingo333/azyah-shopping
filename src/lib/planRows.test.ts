import { describe, expect, it } from 'vitest';
import { visiblePlanRows } from './planRows';

const pills = [
  { name: 'AI Try-On: Picture & Video' },
  { name: 'UGC Collabs' },
  { name: 'Redeem Points' },
  { name: 'Height/Fit Check' },
  { name: 'Taste Learning' },
  { name: 'Post & Earn' },
];
const table = [
  { name: 'Create outfits' },
  { name: 'Wardrobe items' },
  { name: 'UGC collaboration' },
  { name: 'Outfit fitting room' },
];

describe('visiblePlanRows', () => {
  it('drops UGC and Height/Fit rows while those features are off', () => {
    expect(visiblePlanRows(pills, { ugc_collab: false, your_fit: false }).map((r) => r.name)).toEqual([
      'AI Try-On: Picture & Video', 'Redeem Points', 'Taste Learning', 'Post & Earn',
    ]);
    expect(visiblePlanRows(table, { ugc_collab: false, your_fit: false }).map((r) => r.name)).toEqual([
      'Create outfits', 'Wardrobe items', 'Outfit fitting room',
    ]);
  });
  it('keeps them when the features are on', () => {
    expect(visiblePlanRows(pills, { ugc_collab: true, your_fit: true })).toHaveLength(6);
    expect(visiblePlanRows(pills, { ugc_collab: true, your_fit: false }).map((r) => r.name)).toContain('UGC Collabs');
    expect(visiblePlanRows(pills, { ugc_collab: false, your_fit: true }).map((r) => r.name)).toContain('Height/Fit Check');
  });
  it('keeps the extra fields on each row', () => {
    const rows = [{ name: 'Redeem Points', premiumOnly: true }];
    expect(visiblePlanRows(rows, { ugc_collab: false, your_fit: false })[0]).toEqual({ name: 'Redeem Points', premiumOnly: true });
  });
});
