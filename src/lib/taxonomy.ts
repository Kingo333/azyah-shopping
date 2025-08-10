
export type Subcat = { id: string; label: string };
export type Cat = { id: string; label: string; sub?: Subcat[] };

export const TAXONOMY: Cat[] = [
  {
    id: 'clothing',
    label: 'Clothing',
    sub: [
      { id: 'dresses', label: 'Dresses' },
      { id: 'abayas', label: 'Abayas' },
      { id: 'tops', label: 'Tops' },
      { id: 'blouses', label: 'Blouses' },
      { id: 'shirts', label: 'Shirts' },
      { id: 't-shirts', label: 'T-Shirts' },
      { id: 'sweaters', label: 'Sweaters' },
      { id: 'jackets', label: 'Jackets' },
      { id: 'coats', label: 'Coats' },
      { id: 'blazers', label: 'Blazers' },
      { id: 'cardigans', label: 'Cardigans' },
      { id: 'trousers', label: 'Trousers' },
      { id: 'jeans', label: 'Jeans' },
      { id: 'skirts', label: 'Skirts' },
      { id: 'shorts', label: 'Shorts' },
      { id: 'activewear', label: 'Activewear' },
      { id: 'loungewear', label: 'Loungewear' },
      { id: 'sleepwear', label: 'Sleepwear' },
      { id: 'swimwear', label: 'Swimwear' },
      { id: 'lingerie', label: 'Lingerie' },
    ]
  },
  {
    id: 'footwear',
    label: 'Footwear',
    sub: [
      { id: 'heels', label: 'Heels' },
      { id: 'flats', label: 'Flats' },
      { id: 'sandals', label: 'Sandals' },
      { id: 'sneakers', label: 'Sneakers' },
      { id: 'boots', label: 'Boots' },
      { id: 'loafers', label: 'Loafers' },
      { id: 'slippers', label: 'Slippers' },
    ]
  },
  {
    id: 'accessories',
    label: 'Accessories',
    sub: [
      // IMPORTANT: no jewelry or handbags here
      { id: 'belts', label: 'Belts' },
      { id: 'scarves', label: 'Scarves' },
      { id: 'hats', label: 'Hats' },
      { id: 'sunglasses', label: 'Sunglasses' },
      { id: 'watches', label: 'Watches' },
      { id: 'hair-accessories', label: 'Hair Accessories' },
      { id: 'tech-accessories', label: 'Tech Accessories' },
    ]
  },
  {
    id: 'jewelry',
    label: 'Jewelry',
    sub: [
      { id: 'necklaces', label: 'Necklaces' },
      { id: 'earrings', label: 'Earrings' },
      { id: 'bracelets', label: 'Bracelets' },
      { id: 'rings', label: 'Rings' },
      { id: 'anklets', label: 'Anklets' },
      { id: 'brooches', label: 'Brooches' },
    ]
  },
  {
    id: 'bags',
    label: 'Bags',
    sub: [
      { id: 'handbags', label: 'Handbags' },
      { id: 'totes', label: 'Totes' },
      { id: 'crossbody', label: 'Crossbody' },
      { id: 'clutches', label: 'Clutches' },
      { id: 'backpacks', label: 'Backpacks' },
      { id: 'shoulder-bags', label: 'Shoulder Bags' },
      { id: 'wallets', label: 'Wallets' },
    ]
  },
  {
    id: 'beauty',
    label: 'Beauty',
    sub: [
      // Exactly 6 items; no "All Beauty"
      { id: 'skincare', label: 'Skincare' },
      { id: 'haircare', label: 'Haircare' },
      { id: 'makeup', label: 'Makeup' },
      { id: 'fragrances', label: 'Fragrances' },
      { id: 'home-fragrances', label: 'Home Fragrances' },
      { id: 'tools-accessories', label: 'Tools and Accessories' },
    ]
  },
  {
    id: 'modestwear',
    label: 'Modestwear',
    sub: [
      { id: 'abayas', label: 'Abayas' },
      { id: 'hijabs', label: 'Hijabs' },
      { id: 'niqabs', label: 'Niqabs' },
      { id: 'jilbabs', label: 'Jilbabs' },
      { id: 'kaftans', label: 'Kaftans' },
    ]
  },
  {
    id: 'kids',
    label: 'Kids',
    sub: [
      { id: 'baby-clothing', label: 'Baby Clothing' },
      { id: 'girls-clothing', label: 'Girls Clothing' },
      { id: 'boys-clothing', label: 'Boys Clothing' },
      { id: 'kids-footwear', label: 'Kids Footwear' },
      { id: 'kids-accessories', label: 'Kids Accessories' },
    ]
  },
  {
    id: 'fragrance',
    label: 'Fragrance',
    sub: [
      { id: 'oriental', label: 'Oriental' },
      { id: 'floral', label: 'Floral' },
      { id: 'woody', label: 'Woody' },
      { id: 'citrus', label: 'Citrus' },
      { id: 'gourmand', label: 'Gourmand' },
      { id: 'oud', label: 'Oud' },
    ]
  },
  {
    id: 'home',
    label: 'Home',
    sub: [
      { id: 'scented-candles', label: 'Scented Candles' },
      { id: 'diffusers', label: 'Diffusers' },
      { id: 'room-sprays', label: 'Room Sprays' },
      { id: 'fashion-books', label: 'Fashion Books' },
    ]
  },
  {
    id: 'giftcards',
    label: 'Gift Cards',
    sub: [
      { id: 'digital-gift-card', label: 'Digital Gift Card' },
      { id: 'physical-voucher', label: 'Physical Voucher' },
    ]
  },
];

// Helper types - updated to include "bags"
export type CatId = (typeof TAXONOMY)[number]['id'];
export type SubcatId = NonNullable<Cat['sub']>[number]['id'];

// Helper functions
export const getTopCategories = (): Cat[] => TAXONOMY;

export const getCatLabel = (id: CatId): string => 
  TAXONOMY.find(c => c.id === id)?.label ?? id;

export const getSubcategories = (catId: CatId): Subcat[] => 
  TAXONOMY.find(c => c.id === catId)?.sub ?? [];

export const getSubcatLabel = (subId: SubcatId): string => {
  for (const c of TAXONOMY) {
    const found = c.sub?.find(s => s.id === subId);
    if (found) return found.label;
  }
  return subId;
};

export const isValidCatSubPair = (catId: CatId, subId?: string | null): boolean => {
  if (!subId) return true;
  return getSubcategories(catId).some(s => s.id === subId);
};

// Helper function to safely get category label for any string
export const getSafeCatLabel = (id: string): string => {
  const category = TAXONOMY.find(c => c.id === id);
  return category?.label ?? id;
};
