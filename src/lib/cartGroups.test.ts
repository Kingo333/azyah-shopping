import { describe, expect, it } from 'vitest';
import { groupCartBySeller, type CartLine } from './cartGroups';

const line = (id: string, p: Partial<CartLine['product']>, quantity = 1): CartLine & { id: string } => ({
  id,
  quantity,
  product: { price_cents: 1000, ...p },
});

describe('groupCartBySeller', () => {
  it('puts two items from one site in one group named by the brand', () => {
    const groups = groupCartBySeller([
      line('a', { external_url: 'https://www.hanna.com/p/1', brand: { name: 'Hanna Studio' } }),
      line('b', { external_url: 'https://hanna.com/p/2', brand: { name: 'Hanna Studio' } }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ key: 'hanna.com', seller: 'Hanna Studio', buyUrl: 'https://www.hanna.com/p/1' });
    expect(groups[0].items.map((i) => (i as { id: string }).id)).toEqual(['a', 'b']);
  });

  it("names a brand's item on a marketplace by the marketplace", () => {
    const groups = groupCartBySeller([
      line('a', { external_url: 'https://www.ounass.ae/x', merchant_name: 'Ounass', brand: { name: 'Hanna Studio' } }),
    ]);
    expect(groups[0]).toMatchObject({ key: 'ounass.ae', seller: 'Ounass' });
  });

  it('falls back to the site name when there is no merchant or brand', () => {
    expect(groupCartBySeller([line('a', { external_url: 'https://shop.example.com/1' })])[0].seller).toBe('shop.example.com');
  });

  it('puts items without a link in one last group without a button', () => {
    const groups = groupCartBySeller([
      line('a', { external_url: null, brand: { name: 'Lumen' } }),
      line('b', { external_url: 'https://noor.com/1', brand: { name: 'Noor' } }),
      line('c', { external_url: 'not a url' }),
    ]);
    expect(groups.map((g) => g.key)).toEqual(['noor.com', 'offline']);
    expect(groups[1]).toMatchObject({ seller: 'Not sold online yet', buyUrl: null });
    expect(groups[1].items).toHaveLength(2);
  });

  it('keeps first-seen order and counts quantity in the subtotal', () => {
    const groups = groupCartBySeller([
      line('a', { external_url: 'https://b.com/1', price_cents: 500 }, 3),
      line('b', { external_url: 'https://a.com/1', price_cents: 200 }),
      line('c', { external_url: 'https://b.com/2', price_cents: 100 }, 2),
    ]);
    expect(groups.map((g) => g.key)).toEqual(['b.com', 'a.com']);
    expect(groups[0].subtotalCents).toBe(1700);
    expect(groups[1].subtotalCents).toBe(200);
  });

  it('returns nothing for an empty bag', () => {
    expect(groupCartBySeller([])).toEqual([]);
  });
});
