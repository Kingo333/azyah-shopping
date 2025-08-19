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
  brand_name?: string;
  attributes?: {
    gender_target?: 'women' | 'men' | 'unisex' | 'kids';
    size_system?: 'US' | 'UK' | 'EU' | 'CM';
    size?: string;
    color_primary?: string;
  };
  tags?: string[];
}

interface AxessoResponse {
  responseStatus: string;
  productTitle: string;
  manufacturer: string;
  productId: string;
  url: string;
  imageUrlList: string[];
  mainImage?: { imageUrl: string };
  price: number;
  retailPrice?: number;
  available: boolean;
  productDescription: string;
  features: string[];
  domainCode: string;
  variations?: Array<{
    size?: string;
    color?: string;
    available: boolean;
  }>;
}

// Currency mapping based on domain codes
const CURRENCY_MAP: Record<string, string> = {
  'us': 'USD',
  'gb': 'GBP',
  'co.uk': 'GBP', 
  'de': 'EUR',
  'fr': 'EUR',
  'it': 'EUR',
  'es': 'EUR',
  'nl': 'EUR',
  'ie': 'EUR',
  'au': 'AUD',
  'ca': 'CAD',
  'ae': 'AED',
  'sa': 'SAR',
  'dk': 'DKK',
  'se': 'SEK',
  'no': 'NOK',
  'pl': 'PLN',
  'cz': 'CZK'
};

// Size system mapping
const SIZE_SYSTEM_MAP: Record<string, 'US' | 'UK' | 'EU'> = {
  'us': 'US',
  'ca': 'US',
  'gb': 'UK',
  'co.uk': 'UK',
  'ie': 'UK',
  'de': 'EU',
  'fr': 'EU',
  'it': 'EU',
  'es': 'EU',
  'nl': 'EU',
  'dk': 'EU',
  'se': 'EU',
  'no': 'EU',
  'pl': 'EU',
  'cz': 'EU',
  'au': 'US', // Australia typically uses US sizing for most items
  'ae': 'US',
  'sa': 'US'
};

function inferCurrency(domainCode: string): string {
  return CURRENCY_MAP[domainCode.toLowerCase()] || 'USD';
}

function inferSizeSystem(domainCode: string): 'US' | 'UK' | 'EU' | 'CM' | undefined {
  return SIZE_SYSTEM_MAP[domainCode.toLowerCase()];
}

function inferGenderFromText(text: string): 'women' | 'men' | 'unisex' | 'kids' | undefined {
  const lowerText = text.toLowerCase();
  
  // Kids indicators
  if (lowerText.match(/\b(kids?|child|children|baby|toddler|infant|junior|youth|boys?|girls?)\b/)) {
    return 'kids';
  }
  
  // Women indicators
  if (lowerText.match(/\b(women|woman|ladies?|lady|female|abaya|dress|skirt|heel|maternity)\b/)) {
    return 'women';
  }
  
  // Men indicators  
  if (lowerText.match(/\b(men|man|male|masculine|gentleman|gents?)\b/)) {
    return 'men';
  }
  
  // Unisex indicators
  if (lowerText.match(/\b(unisex|universal|everyone|all)\b/)) {
    return 'unisex';
  }
  
  return undefined;
}

function inferColorFromText(text: string): string | undefined {
  const lowerText = text.toLowerCase();
  
  // Common color patterns
  const colorPatterns = [
    { pattern: /\b(black|noir)\b/, color: 'black' },
    { pattern: /\b(white|blanc|cream|ivory|off[- ]?white)\b/, color: 'white' },
    { pattern: /\b(red|rouge|crimson|scarlet)\b/, color: 'red' },
    { pattern: /\b(blue|bleu|navy|royal)\b/, color: 'blue' },
    { pattern: /\b(green|vert|olive|forest)\b/, color: 'green' },
    { pattern: /\b(brown|marron|chocolate|tan|beige)\b/, color: 'brown' },
    { pattern: /\b(pink|rose|blush)\b/, color: 'pink' },
    { pattern: /\b(purple|violet|mauve)\b/, color: 'purple' },
    { pattern: /\b(yellow|jaune|gold)\b/, color: 'yellow' },
    { pattern: /\b(orange|coral)\b/, color: 'orange' },
    { pattern: /\b(gray|grey|gris|silver)\b/, color: 'gray' }
  ];
  
  for (const { pattern, color } of colorPatterns) {
    if (pattern.test(lowerText)) {
      return color;
    }
  }
  
  return undefined;
}

function inferCategoryFromText(text: string): { category_slug: string; subcategory_slug?: string } {
  const lowerText = text.toLowerCase();
  
  // First check for gender-specific indicators
  const gender = inferGenderFromText(text);
  
  // Modestwear
  if (lowerText.match(/\b(abaya|hijab|niqab|jilbab|kaftan|modest)\b/)) {
    if (lowerText.includes('abaya')) return { category_slug: 'modestwear', subcategory_slug: 'abayas' };
    if (lowerText.includes('hijab')) return { category_slug: 'modestwear', subcategory_slug: 'hijabs' };
    return { category_slug: 'modestwear' };
  }
  
  // Footwear
  if (lowerText.match(/\b(shoe|boot|sneaker|trainer|sandal|heel|flat|loafer|slipper)\b/)) {
    // Check gender first
    if (gender === 'men') {
      return { category_slug: 'men', subcategory_slug: 'mens footwear' };
    } else if (gender === 'women') {
      return { category_slug: 'women', subcategory_slug: 'womens footwear' };
    }
    
    // Fall back to specific footwear types
    if (lowerText.match(/\b(heel|pump)\b/)) return { category_slug: 'footwear', subcategory_slug: 'heels' };
    if (lowerText.match(/\b(flat|ballet)\b/)) return { category_slug: 'footwear', subcategory_slug: 'flats' };
    if (lowerText.match(/\b(sandal)\b/)) return { category_slug: 'footwear', subcategory_slug: 'sandals' };
    if (lowerText.match(/\b(sneaker|trainer)\b/)) return { category_slug: 'footwear', subcategory_slug: 'sneakers' };
    if (lowerText.match(/\b(boot)\b/)) return { category_slug: 'footwear', subcategory_slug: 'boots' };
    return { category_slug: 'footwear' };
  }
  
  // Jewelry
  if (lowerText.match(/\b(jewelry|jewellery|necklace|earring|bracelet|ring|anklet|brooch)\b/)) {
    if (lowerText.includes('necklace')) return { category_slug: 'jewelry', subcategory_slug: 'necklaces' };
    if (lowerText.includes('earring')) return { category_slug: 'jewelry', subcategory_slug: 'earrings' };
    if (lowerText.includes('bracelet')) return { category_slug: 'jewelry', subcategory_slug: 'bracelets' };
    if (lowerText.includes('ring')) return { category_slug: 'jewelry', subcategory_slug: 'rings' };
    return { category_slug: 'jewelry' };
  }
  
  // Accessories
  if (lowerText.match(/\b(bag|handbag|purse|clutch|tote|backpack|wallet|belt|scarf|hat|sunglasses|watch)\b/)) {
    // Check gender first for accessories
    if (gender === 'men') {
      return { category_slug: 'men', subcategory_slug: 'mens accessories' };
    } else if (gender === 'women') {
      return { category_slug: 'women', subcategory_slug: 'womens accessories' };
    }
    
    // Fall back to specific accessory types
    if (lowerText.match(/\b(handbag|purse)\b/)) return { category_slug: 'bags', subcategory_slug: 'handbags' };
    if (lowerText.includes('clutch')) return { category_slug: 'bags', subcategory_slug: 'clutches' };
    if (lowerText.includes('tote')) return { category_slug: 'bags', subcategory_slug: 'totes' };
    if (lowerText.includes('backpack')) return { category_slug: 'bags', subcategory_slug: 'backpacks' };
    if (lowerText.includes('wallet')) return { category_slug: 'bags', subcategory_slug: 'wallets' };
    if (lowerText.includes('belt')) return { category_slug: 'accessories', subcategory_slug: 'belts' };
    if (lowerText.includes('scarf')) return { category_slug: 'accessories', subcategory_slug: 'scarves' };
    if (lowerText.includes('hat')) return { category_slug: 'accessories', subcategory_slug: 'hats' };
    if (lowerText.includes('sunglasses')) return { category_slug: 'accessories', subcategory_slug: 'sunglasses' };
    if (lowerText.includes('watch')) return { category_slug: 'accessories', subcategory_slug: 'watches' };
    return { category_slug: 'accessories' };
  }
  
  // Beauty
  if (lowerText.match(/\b(perfume|fragrance|cologne|makeup|cosmetic|skincare|beauty|lipstick|foundation)\b/)) {
    if (lowerText.match(/\b(perfume|fragrance|cologne)\b/)) return { category_slug: 'fragrance', subcategory_slug: 'oriental' };
    return { category_slug: 'beauty' };
  }
  
  // Clothing - prioritize gender-based categorization
  if (gender === 'men') {
    return { category_slug: 'men', subcategory_slug: 'mens clothing' };
  } else if (gender === 'women') {
    return { category_slug: 'women', subcategory_slug: 'womens clothing' };
  }
  
  // Fall back to specific clothing types for general clothing category
  if (lowerText.match(/\b(dress)\b/)) return { category_slug: 'clothing', subcategory_slug: 'dresses' };
  if (lowerText.match(/\b(top|blouse)\b/)) return { category_slug: 'clothing', subcategory_slug: 'tops' };
  if (lowerText.match(/\b(shirt)\b/)) return { category_slug: 'clothing', subcategory_slug: 'shirts' };
  if (lowerText.match(/\b(t[- ]?shirt|tee)\b/)) return { category_slug: 'clothing', subcategory_slug: 't-shirts' };
  if (lowerText.match(/\b(sweater|jumper|pullover)\b/)) return { category_slug: 'clothing', subcategory_slug: 'sweaters' };
  if (lowerText.match(/\b(jacket|coat)\b/)) return { category_slug: 'clothing', subcategory_slug: 'jackets' };
  if (lowerText.match(/\b(trouser|pant)\b/)) return { category_slug: 'clothing', subcategory_slug: 'trousers' };
  if (lowerText.match(/\b(jean)\b/)) return { category_slug: 'clothing', subcategory_slug: 'jeans' };
  if (lowerText.match(/\b(skirt)\b/)) return { category_slug: 'clothing', subcategory_slug: 'skirts' };
  if (lowerText.match(/\b(short)\b/)) return { category_slug: 'clothing', subcategory_slug: 'shorts' };
  
  // Default to women's clothing if no specific indicators found (since most fashion items default to women's)
  return { category_slug: 'women', subcategory_slug: 'womens clothing' };
}

// ASOS CDN hosts for image upgrading
const ASOS_HOSTS = ['images.asos-media.com', 'asos-media.com'];
const ASOS_IMG_PARAMS = {
  wid: '1500',              // big enough for detail view + 2x DPR cards
  fit: 'constrain',         // keep aspect
  fmt: 'jpg',               // force jpg (or webp if you prefer)
  qlt: '90',                // quality
  resmode: 'sharp2',        // crisper resizing on their CDN
  bg: 'fff'                 // guard against transparency artifacts
};

function upgradeAsosImageUrl(u: string, minWid = 1500): string {
  try {
    const url = new URL(u);
    if (!ASOS_HOSTS.some(h => url.hostname.endsWith(h))) return u;

    // Some ASOS paths contain macros like $n_640w$ — strip them so query wins
    url.pathname = url.pathname.replace(/\$[^$]*\$/g, '');

    // If a wid is already present, bump it up, otherwise set our defaults
    const currentWid = Number(url.searchParams.get('wid') || '0');
    const targetWid = Math.max(currentWid || 0, minWid);
    url.searchParams.set('wid', String(targetWid));

    // These strongly influence crispness
    url.searchParams.set('fit', ASOS_IMG_PARAMS.fit);
    url.searchParams.set('fmt', ASOS_IMG_PARAMS.fmt);
    url.searchParams.set('qlt', ASOS_IMG_PARAMS.qlt);
    url.searchParams.set('resmode', ASOS_IMG_PARAMS.resmode);
    url.searchParams.set('bg', ASOS_IMG_PARAMS.bg);
    return url.toString();
  } catch {
    return u;
  }
}

function extractSizeFromVariations(variations?: Array<{ size?: string; color?: string; available: boolean }>): string | undefined {
  if (!variations?.length) return undefined;
  
  // Find the first available size
  const availableSize = variations.find(v => v.available && v.size);
  return availableSize?.size;
}

export function transformAxessoToAzyah(axessoData: AxessoResponse, retailerId: string): TransformedProduct | null {
  // Validate required fields
  if (!axessoData.productTitle || !axessoData.url || !axessoData.productId) {
    return null;
  }
  
  const title = axessoData.productTitle.trim();
  if (title.length < 3) {
    return null;
  }
  
  // Price validation and conversion
  const price = typeof axessoData.price === 'number' && axessoData.price > 0 
    ? axessoData.price 
    : (typeof axessoData.retailPrice === 'number' && axessoData.retailPrice > 0 ? axessoData.retailPrice : 0);
    
  if (price <= 0) {
    return null;
  }
  
  const price_cents = Math.round(price * 100);
  const compare_at_price_cents = (typeof axessoData.retailPrice === 'number' && axessoData.retailPrice > price) 
    ? Math.round(axessoData.retailPrice * 100) 
    : undefined;
  
  // Media URLs - upgrade ASOS URLs for high-res
  const rawImages = Array.isArray(axessoData.imageUrlList) && axessoData.imageUrlList.length 
    ? axessoData.imageUrlList 
    : (axessoData.mainImage?.imageUrl ? [axessoData.mainImage.imageUrl] : []);
    
  const media_urls = [...new Set(
    rawImages
      .filter(url => typeof url === 'string' && /^https:\/\//.test(url))
      .map(url => upgradeAsosImageUrl(url, 1500)) // 👈 enforce high-res
  )];
    
  if (media_urls.length === 0) {
    return null;
  }
  
  // SKU validation
  const sku = String(axessoData.productId || '').trim();
  if (!sku) {
    return null;
  }
  
  // Currency and region inference
  const currency = inferCurrency(axessoData.domainCode);
  const sizeSystem = inferSizeSystem(axessoData.domainCode);
  
  // Content analysis for metadata
  const fullText = `${title} ${axessoData.productDescription || ''}`;
  const gender_target = inferGenderFromText(fullText);
  const color_primary = inferColorFromText(fullText);
  const { category_slug, subcategory_slug } = inferCategoryFromText(fullText);
  const size = extractSizeFromVariations(axessoData.variations);
  
  return {
    title,
    price_cents,
    compare_at_price_cents,
    currency,
    media_urls,
    category_slug,
    subcategory_slug,
    sku,
    external_url: axessoData.url,
    description: axessoData.productDescription || undefined,
    brand_name: axessoData.manufacturer || undefined,
    attributes: {
      gender_target,
      size_system: sizeSystem,
      size,
      color_primary
    },
    tags: axessoData.features || []
  };
}

// Function for image quality checking
function passesImageQuality(urls: string[]): boolean {
  // All ASOS images will have ?wid=... after upgrade; use that as a proxy for minimum width
  const hasHighRes = urls.some(u => {
    try {
      return Number(new URL(u).searchParams.get('wid') || '0') >= 1000;
    } catch {
      return false;
    }
  });
  return hasHighRes;
}

// Quality score calculation (0-100)
export function calculateQualityScore(product: TransformedProduct): number {
  let score = 0;
  
  // Required fields (40 points)
  if (product.title && product.title.length >= 10) score += 10;
  if (product.price_cents > 0) score += 10;
  if (product.media_urls.length >= 1) score += 10;
  if (product.category_slug) score += 10;
  
  // Enhanced fields (30 points)
  if (product.description && product.description.length >= 20) score += 10;
  if (product.brand_name) score += 10;
  if (product.subcategory_slug) score += 10;
  
  // Media quality (20 points)
  if (product.media_urls.length >= 3) score += 10;
  if (product.media_urls.length >= 2) score += 5;
  if (product.media_urls.length >= 1) score += 5;
  
  // Image quality check - bonus points for high-res
  if (passesImageQuality(product.media_urls)) score += 5;
  
  // Attributes completeness (10 points)
  if (product.attributes?.gender_target) score += 3;
  if (product.attributes?.color_primary) score += 3;
  if (product.attributes?.size_system) score += 2;
  if (product.attributes?.size) score += 2;
  
  return Math.min(score, 100);
}

// Export upgradeAsosImageUrl for use in other components
export { upgradeAsosImageUrl };