
// Unified Category Taxonomy for Azyah Platform
export const CATEGORY_TREE = {
  women: ['womens clothing', 'womens footwear', 'womens accessories'],
  men: ['mens clothing', 'mens footwear', 'mens accessories'],
  clothing: [
    'dresses', 'abayas', 'tops', 'blouses', 'shirts', 't-shirts', 'sweaters',
    'jackets', 'coats', 'blazers', 'cardigans', 'trousers', 'jeans', 'skirts',
    'shorts', 'activewear', 'loungewear', 'sleepwear', 'swimwear', 'lingerie'
  ],
  footwear: ['heels', 'flats', 'sandals', 'sneakers', 'boots', 'loafers', 'slippers'],
  accessories: [
    'belts', 'scarves', 'hats', 'sunglasses', 'watches'
  ],
  jewelry: ['necklaces', 'earrings', 'bracelets', 'rings', 'anklets', 'brooches'],
  beauty: ['all beauty', 'skincare', 'haircare', 'makeup', 'fragrances', 'home fragrances', 'tools & accessories'],
  bags: ['handbags', 'clutches', 'totes', 'backpacks', 'wallets'],
  modestwear: ['abayas', 'hijabs', 'niqabs', 'jilbabs', 'kaftans'],
  kids: ['baby clothing', 'girls clothing', 'boys clothing', 'kids footwear', 'kids accessories'],
  fragrance: ['oriental', 'floral', 'woody', 'citrus', 'gourmand', 'oud'],
  home: ['scented candles', 'diffusers', 'room sprays', 'fashion books'],
  giftcards: ['digital gift card', 'physical voucher']
} as const;

export type TopCategory = keyof typeof CATEGORY_TREE;
export type SubCategory = (typeof CATEGORY_TREE)[TopCategory][number];

// Helper functions
export const getAllCategories = (): TopCategory[] => Object.keys(CATEGORY_TREE) as TopCategory[];

export const getSubcategoriesForCategory = (category: TopCategory): readonly SubCategory[] => {
  return CATEGORY_TREE[category];
};

export const isValidCategorySubcategoryPair = (category: TopCategory, subcategory: SubCategory): boolean => {
  return (CATEGORY_TREE[category] as readonly SubCategory[]).includes(subcategory);
};

export const getCategoryDisplayName = (category: TopCategory): string => {
  return category.charAt(0).toUpperCase() + category.slice(1);
};

export const getSubcategoryDisplayName = (subcategory: SubCategory): string => {
  return subcategory.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};
