import type { ProductAttributes } from '@/types';
import type { AxessoResponse } from './axesso-client';

interface TransformedProduct {
  title: string;
  price_cents: number;
  compare_at_price_cents?: number;
  currency: string;
  media_urls: string[];
  category_slug: string;
  subcategory_slug?: string;
  sku: string;
  external_url: string;
  description?: string;
  brand_name: string;
  attributes: ProductAttributes;
  tags: string[];
  source: string;
  source_vendor: string;
  is_external: boolean;
}

const CURRENCY_MAP: Record<string, string> = {
  us: 'USD',
  gb: 'GBP',
  de: 'EUR',
  fr: 'EUR',
  it: 'EUR',
  es: 'EUR',
  nl: 'EUR',
  ie: 'EUR',
  at: 'EUR',
  be: 'EUR',
  pt: 'EUR',
  fi: 'EUR',
  lu: 'EUR',
  dk: 'DKK',
  se: 'SEK',
  no: 'NOK',
  pl: 'PLN',
  cz: 'CZK',
  hu: 'HUF',
  ch: 'CHF',
  au: 'AUD',
  ca: 'CAD',
  ae: 'AED',
  sa: 'SAR',
  jp: 'JPY',
};

const SIZE_SYSTEM_MAP: Record<string, string> = {
  gb: 'UK',
  ie: 'UK',
  us: 'US',
  ca: 'US',
  au: 'US',
  ae: 'US',
  sa: 'US',
  de: 'EU',
  fr: 'EU',
  it: 'EU',
  es: 'EU',
  nl: 'EU',
  at: 'EU',
  be: 'EU',
  pt: 'EU',
  fi: 'EU',
  lu: 'EU',
  dk: 'EU',
  se: 'EU',
  no: 'EU',
  pl: 'EU',
  cz: 'EU',
  hu: 'EU',
  ch: 'EU',
};

function inferCurrency(domainCode: string): string {
  const code = domainCode?.toLowerCase() || 'us';
  return CURRENCY_MAP[code] || 'USD';
}

function inferSizeSystem(domainCode: string): 'US' | 'UK' | 'EU' | 'CM' | undefined {
  const code = domainCode?.toLowerCase() || 'us';
  return SIZE_SYSTEM_MAP[code] as 'US' | 'UK' | 'EU' | 'CM' | undefined;
}

function inferGenderFromText(text: string): 'women' | 'men' | 'unisex' | 'kids' | undefined {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('kid') || lowerText.includes('child') || lowerText.includes('baby')) {
    return 'kids';
  }
  
  const womenKeywords = ['abaya', 'dress', 'skirt', 'heel', 'women', 'woman', 'ladies', 'lady', 'feminine', 'maternity'];
  const menKeywords = ['men', 'man', 'masculine', 'gentlemen', 'gents', 'oxford', 'brogue'];
  
  const hasWomenKeywords = womenKeywords.some(keyword => lowerText.includes(keyword));
  const hasMenKeywords = menKeywords.some(keyword => lowerText.includes(keyword));
  
  if (hasWomenKeywords && !hasMenKeywords) return 'women';
  if (hasMenKeywords && !hasWomenKeywords) return 'men';
  if (hasWomenKeywords && hasMenKeywords) return 'unisex';
  
  return undefined;
}

function inferColorFromText(text: string): string | undefined {
  const lowerText = text.toLowerCase();
  
  const colorMap: Record<string, string> = {
    black: 'black',
    white: 'white',
    'off-white': 'white',
    'off white': 'white',
    red: 'red',
    blue: 'blue',
    green: 'green',
    yellow: 'yellow',
    pink: 'pink',
    purple: 'purple',
    brown: 'brown',
    grey: 'grey',
    gray: 'grey',
    orange: 'orange',
    beige: 'beige',
    navy: 'blue',
    cream: 'white',
    gold: 'gold',
    silver: 'silver',
    rose: 'pink',
    burgundy: 'red',
    chocolate: 'brown',
    camel: 'brown',
    khaki: 'green',
    olive: 'green',
  };
  
  for (const [keyword, color] of Object.entries(colorMap)) {
    if (lowerText.includes(keyword)) {
      return color;
    }
  }
  
  return undefined;
}

function inferCategoryFromText(text: string): { category_slug: string; subcategory_slug?: string } {
  const lowerText = text.toLowerCase();
  
  // Modestwear
  if (lowerText.includes('abaya')) return { category_slug: 'modestwear', subcategory_slug: 'abayas' };
  if (lowerText.includes('hijab')) return { category_slug: 'modestwear', subcategory_slug: 'hijabs' };
  if (lowerText.includes('kaftan')) return { category_slug: 'modestwear', subcategory_slug: 'kaftans' };
  
  // Footwear
  if (lowerText.includes('sneaker') || lowerText.includes('trainer')) {
    return { category_slug: 'footwear', subcategory_slug: 'sneakers' };
  }
  if (lowerText.includes('heel') || lowerText.includes('stiletto')) {
    return { category_slug: 'footwear', subcategory_slug: 'heels' };
  }
  if (lowerText.includes('boot')) return { category_slug: 'footwear', subcategory_slug: 'boots' };
  if (lowerText.includes('sandal')) return { category_slug: 'footwear', subcategory_slug: 'sandals' };
  if (lowerText.includes('flat') || lowerText.includes('ballet')) {
    return { category_slug: 'footwear', subcategory_slug: 'flats' };
  }
  if (lowerText.includes('loafer')) return { category_slug: 'footwear', subcategory_slug: 'loafers' };
  
  // Accessories
  if (lowerText.includes('bag') || lowerText.includes('handbag') || lowerText.includes('purse')) {
    return { category_slug: 'accessories', subcategory_slug: 'handbags' };
  }
  if (lowerText.includes('clutch')) return { category_slug: 'accessories', subcategory_slug: 'clutches' };
  if (lowerText.includes('tote')) return { category_slug: 'accessories', subcategory_slug: 'totes' };
  if (lowerText.includes('backpack')) return { category_slug: 'accessories', subcategory_slug: 'backpacks' };
  if (lowerText.includes('wallet')) return { category_slug: 'accessories', subcategory_slug: 'wallets' };
  if (lowerText.includes('belt')) return { category_slug: 'accessories', subcategory_slug: 'belts' };
  if (lowerText.includes('scarf')) return { category_slug: 'accessories', subcategory_slug: 'scarves' };
  if (lowerText.includes('hat') || lowerText.includes('cap')) {
    return { category_slug: 'accessories', subcategory_slug: 'hats' };
  }
  if (lowerText.includes('sunglasses') || lowerText.includes('glasses')) {
    return { category_slug: 'accessories', subcategory_slug: 'sunglasses' };
  }
  if (lowerText.includes('watch')) return { category_slug: 'accessories', subcategory_slug: 'watches' };
  
  // Jewelry
  if (lowerText.includes('necklace')) return { category_slug: 'jewelry', subcategory_slug: 'necklaces' };
  if (lowerText.includes('earring')) return { category_slug: 'jewelry', subcategory_slug: 'earrings' };
  if (lowerText.includes('bracelet')) return { category_slug: 'jewelry', subcategory_slug: 'bracelets' };
  if (lowerText.includes('ring')) return { category_slug: 'jewelry', subcategory_slug: 'rings' };
  if (lowerText.includes('anklet')) return { category_slug: 'jewelry', subcategory_slug: 'anklets' };
  
  // Beauty & Fragrance
  if (lowerText.includes('perfume') || lowerText.includes('fragrance')) {
    return { category_slug: 'beauty', subcategory_slug: 'perfume' };
  }
  if (lowerText.includes('eau de toilette')) {
    return { category_slug: 'beauty', subcategory_slug: 'eau-de-toilette' };
  }
  if (lowerText.includes('eau de parfum')) {
    return { category_slug: 'beauty', subcategory_slug: 'eau-de-parfum' };
  }
  if (lowerText.includes('makeup') || lowerText.includes('cosmetic')) {
    return { category_slug: 'beauty', subcategory_slug: 'makeup' };
  }
  if (lowerText.includes('skincare') || lowerText.includes('moistur')) {
    return { category_slug: 'beauty', subcategory_slug: 'skincare' };
  }
  
  // Clothing subcategories
  if (lowerText.includes('dress')) return { category_slug: 'clothing', subcategory_slug: 'dresses' };
  if (lowerText.includes('top') || lowerText.includes('blouse')) {
    return { category_slug: 'clothing', subcategory_slug: 'tops' };
  }
  if (lowerText.includes('shirt')) return { category_slug: 'clothing', subcategory_slug: 'shirts' };
  if (lowerText.includes('t-shirt') || lowerText.includes('tshirt')) {
    return { category_slug: 'clothing', subcategory_slug: 't-shirts' };
  }
  if (lowerText.includes('sweater') || lowerText.includes('jumper')) {
    return { category_slug: 'clothing', subcategory_slug: 'sweaters' };
  }
  if (lowerText.includes('jacket') || lowerText.includes('coat')) {
    return { category_slug: 'clothing', subcategory_slug: 'jackets' };
  }
  if (lowerText.includes('blazer')) return { category_slug: 'clothing', subcategory_slug: 'blazers' };
  if (lowerText.includes('cardigan')) return { category_slug: 'clothing', subcategory_slug: 'cardigans' };
  if (lowerText.includes('trouser') || lowerText.includes('pant')) {
    return { category_slug: 'clothing', subcategory_slug: 'trousers' };
  }
  if (lowerText.includes('jean')) return { category_slug: 'clothing', subcategory_slug: 'jeans' };
  if (lowerText.includes('skirt')) return { category_slug: 'clothing', subcategory_slug: 'skirts' };
  if (lowerText.includes('short')) return { category_slug: 'clothing', subcategory_slug: 'shorts' };
  if (lowerText.includes('activewear') || lowerText.includes('sportswear')) {
    return { category_slug: 'clothing', subcategory_slug: 'activewear' };
  }
  if (lowerText.includes('loungewear')) return { category_slug: 'clothing', subcategory_slug: 'loungewear' };
  if (lowerText.includes('sleepwear') || lowerText.includes('pajam') || lowerText.includes('nightwear')) {
    return { category_slug: 'clothing', subcategory_slug: 'sleepwear' };
  }
  if (lowerText.includes('swimwear') || lowerText.includes('bikini') || lowerText.includes('swimsuit')) {
    return { category_slug: 'clothing', subcategory_slug: 'swimwear' };
  }
  if (lowerText.includes('lingerie') || lowerText.includes('underwear') || lowerText.includes('bra')) {
    return { category_slug: 'clothing', subcategory_slug: 'lingerie' };
  }
  
  // Default to clothing
  return { category_slug: 'clothing' };
}

function extractSizeFromVariations(variations?: Array<{ size?: string; color?: string; available: boolean }>): string | undefined {
  if (!variations || variations.length === 0) return undefined;
  
  const availableSizes = variations
    .filter(v => v.available && v.size)
    .map(v => v.size)
    .filter(Boolean);
    
  return availableSizes.length > 0 ? availableSizes[0] : undefined;
}

export function transformAxessoToAzyah(
  axessoData: AxessoResponse,
  retailerId: string
): TransformedProduct | null {
  // Validate required fields
  if (
    axessoData.responseStatus !== 'PRODUCT_FOUND_RESPONSE' ||
    !axessoData.productTitle?.trim() ||
    !axessoData.url?.trim() ||
    !axessoData.productId?.toString()?.trim()
  ) {
    return null;
  }

  const title = axessoData.productTitle.trim();
  if (title.length < 3) return null;

  // Price handling
  const price = axessoData.price > 0 ? axessoData.price : (axessoData.retailPrice || 0);
  if (price <= 0) return null;

  const price_cents = Math.round(price * 100);
  const compare_at_price_cents = 
    axessoData.retailPrice && axessoData.retailPrice > price 
      ? Math.round(axessoData.retailPrice * 100) 
      : undefined;

  // Images
  const imageUrls = [
    ...(Array.isArray(axessoData.imageUrlList) ? axessoData.imageUrlList : []),
    ...(axessoData.mainImage?.imageUrl ? [axessoData.mainImage.imageUrl] : []),
  ];
  
  const media_urls = [...new Set(imageUrls)]
    .filter(url => url && typeof url === 'string' && url.startsWith('http'))
    .slice(0, 10); // Limit to 10 images
    
  if (media_urls.length === 0) return null;

  // SKU
  const sku = axessoData.productId.toString().trim();

  // Brand
  const brand_name = (axessoData.manufacturer || 'ASOS').trim();

  // Currency
  const currency = inferCurrency(axessoData.domainCode);

  // Category mapping
  const searchText = `${title} ${axessoData.productDescription || ''} ${(axessoData.features || []).join(' ')}`;
  const { category_slug, subcategory_slug } = inferCategoryFromText(searchText);

  // Attributes
  const gender_target = inferGenderFromText(title);
  const size_system = inferSizeSystem(axessoData.domainCode);
  const color_primary = inferColorFromText(title);
  const size = extractSizeFromVariations(axessoData.variations);

  const attributes: ProductAttributes = {
    gender_target,
    size_system,
    size,
    color_primary,
    style_tags: axessoData.features || [],
  };

  return {
    title,
    price_cents,
    compare_at_price_cents,
    currency,
    media_urls,
    category_slug: category_slug as any, // Type assertion for enum
    subcategory_slug: subcategory_slug as any,
    sku,
    external_url: axessoData.url,
    description: axessoData.productDescription?.trim() || undefined,
    brand_name,
    attributes,
    tags: axessoData.features || [],
    source: 'ASOS_AXESSO',
    source_vendor: 'ASOS',
    is_external: true,
  };
}

// Quality scoring function
export function calculateQualityScore(product: TransformedProduct): number {
  let score = 0;

  // Required fields (40 points)
  if (product.title && product.title.length >= 10) score += 10;
  if (product.price_cents > 0) score += 10;
  if (product.media_urls.length >= 1) score += 10;
  if (product.external_url) score += 10;

  // Description quality (20 points)
  if (product.description) {
    if (product.description.length >= 50) score += 10;
    if (product.description.length >= 150) score += 10;
  }

  // Image quality (20 points)
  if (product.media_urls.length >= 2) score += 10;
  if (product.media_urls.length >= 4) score += 10;

  // Attribute completeness (20 points)
  if (product.attributes.gender_target) score += 5;
  if (product.attributes.color_primary) score += 5;
  if (product.attributes.size_system) score += 5;
  if (product.brand_name && product.brand_name !== 'ASOS') score += 5;

  return Math.min(score, 100);
}