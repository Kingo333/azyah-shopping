/**
 * Product Extraction Logic
 * Ported from src/lib/webview-extractor.ts
 * Priority: JSON-LD → OpenGraph → DOM fallback
 */

const PATTERN_WORDS = [
  'printed', 'print', 'floral', 'paisley', 'abstract', 'geometric',
  'animal', 'leopard', 'zebra', 'snake', 'polka', 'dot', 'striped',
  'stripe', 'plaid', 'check', 'gingham', 'tartan', 'houndstooth',
  'tie-dye', 'marble', 'tropical', 'botanical', 'damask', 'toile',
  'ikat', 'aztec', 'tribal', 'ethnic', 'batik', 'chinoiserie',
  'embroidered', 'embroidery', 'sequin', 'beaded', 'crystal',
  'applique', 'patchwork', 'quilted', 'textured', 'ribbed',
  'lace', 'mesh', 'sheer', 'see-through', 'crochet', 'knit',
  'gradient', 'ombre', 'color-block', 'two-tone', 'contrast',
  'colorful', 'vibrant', 'bold'
];

const CATEGORY_WORDS = [
  'dress', 'abaya', 'kaftan', 'caftan', 'outer', 'jacket', 'kimono',
  'jalabiya', 'jilbab', 'thobe', 'bisht', 'cardigan', 'coat', 'blazer',
  'modest', 'maxi', 'midi', 'gown', 'cape', 'poncho', 'tunic',
  'shoes', 'bag', 'pants', 'top', 'skirt', 'hijab', 'scarf'
];

/**
 * Extract product information from the current page
 */
function extractProduct() {
  const result = {
    success: false,
    context: null,
    error: null,
    extraction_method: null,
    allCandidateImages: []
  };

  try {
    const context = {
      page_url: window.location.href,
      extracted_from: 'chrome_ext',
      extraction_confidence: 'low',
      title: null,
      brand: null,
      price: null,
      currency: null,
      main_image_url: null,
      image_urls: [],
      category_hint: null
    };

    // 1. Try JSON-LD Product schema (highest confidence)
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of jsonLdScripts) {
      try {
        const data = JSON.parse(script.textContent || '');
        const products = Array.isArray(data) ? data : [data];
        
        // Also check @graph array
        for (const item of products) {
          const candidates = item['@graph'] ? item['@graph'] : [item];
          
          for (const candidate of candidates) {
            if (candidate['@type'] === 'Product' || candidate['@type']?.includes?.('Product')) {
              context.title = candidate.name;
              context.brand = candidate.brand?.name || candidate.brand;
              
              // Handle price
              const offer = candidate.offers?.[0] || candidate.offers;
              if (offer) {
                context.price = parseFloat(offer.price) || undefined;
                context.currency = offer.priceCurrency;
              }
              
              // Handle images
              if (candidate.image) {
                const images = Array.isArray(candidate.image) ? candidate.image : [candidate.image];
                context.main_image_url = typeof images[0] === 'string' ? images[0] : images[0]?.url;
                context.image_urls = images.map(img => typeof img === 'string' ? img : img?.url).filter(Boolean);
              }
              
              context.category_hint = candidate.category;
              context.extraction_confidence = 'high';
              result.extraction_method = 'json_ld';
              break;
            }
          }
          if (result.extraction_method) break;
        }
      } catch (e) {
        // Continue to next script
      }
    }

    // 2. Try OpenGraph tags (medium confidence)
    if (!context.title) {
      const ogTitle = document.querySelector('meta[property="og:title"]')?.content;
      const ogImage = document.querySelector('meta[property="og:image"]')?.content;
      const ogSiteName = document.querySelector('meta[property="og:site_name"]')?.content;
      
      if (ogTitle || ogImage) {
        context.title = context.title || ogTitle;
        context.main_image_url = context.main_image_url || ogImage;
        context.brand = context.brand || ogSiteName;
        
        if (!result.extraction_method) {
          context.extraction_confidence = 'medium';
          result.extraction_method = 'og_tags';
        }
      }
    }

    // 3. DOM fallback (low confidence)
    if (!context.title) {
      const titleSelectors = [
        'h1[data-testid="product-title"]',
        'h1.product-title',
        '.product-name h1',
        '[itemprop="name"]',
        '.pdp-title',
        '#productTitle',
        '[data-testid="product-name"]',
        'h1'
      ];
      
      for (const selector of titleSelectors) {
        const el = document.querySelector(selector);
        if (el?.textContent?.trim()) {
          context.title = el.textContent.trim();
          break;
        }
      }
    }

    // Try to get price from DOM
    if (!context.price) {
      const priceSelectors = [
        '[data-testid="current-price"]',
        '.product-price',
        '[itemprop="price"]',
        '.price-current',
        '.pdp-price',
        '#priceblock_ourprice',
        '#priceblock_dealprice',
        '[data-testid="price"]',
        '.price'
      ];
      
      for (const selector of priceSelectors) {
        const el = document.querySelector(selector);
        if (el?.textContent) {
          const match = el.textContent.replace(/,/g, '').match(/[\d.]+/);
          if (match) {
            context.price = parseFloat(match[0]);
            
            // Try to detect currency
            const currencyMatch = el.textContent.match(/(AED|USD|EUR|GBP|SAR|£|\$|€)/);
            if (currencyMatch) {
              context.currency = currencyMatch[1];
            }
            break;
          }
        }
      }
    }

    // Try to get main image from DOM
    if (!context.main_image_url) {
      const imageSelectors = [
        '.product-image img',
        '.pdp-image img',
        '[data-testid="product-image"] img',
        '.gallery-image img',
        'img[itemprop="image"]',
        '#landingImage',
        '#imgTagWrapperId img',
        '.product img'
      ];
      
      for (const selector of imageSelectors) {
        const el = document.querySelector(selector);
        const src = el?.src || el?.getAttribute('data-src');
        if (src && !src.includes('placeholder') && !src.includes('data:')) {
          context.main_image_url = src;
          break;
        }
      }
      
      if (!result.extraction_method && context.title) {
        context.extraction_confidence = 'low';
        result.extraction_method = 'dom_fallback';
      }
    }

    // Collect all candidate images for manual selection
    const allImages = document.querySelectorAll('img');
    const candidateImages = [];
    
    for (const img of allImages) {
      const src = img.src || img.getAttribute('data-src');
      if (!src || src.includes('data:') || src.includes('placeholder')) continue;
      
      // Filter by minimum size
      const width = img.naturalWidth || img.width || parseInt(img.getAttribute('width')) || 0;
      const height = img.naturalHeight || img.height || parseInt(img.getAttribute('height')) || 0;
      
      if (width >= 100 && height >= 100) {
        candidateImages.push({
          src,
          width,
          height,
          area: width * height
        });
      }
    }
    
    // Sort by area (largest first)
    candidateImages.sort((a, b) => b.area - a.area);
    result.allCandidateImages = candidateImages.slice(0, 20).map(c => c.src);

    // If we still don't have main image, use largest candidate
    if (!context.main_image_url && result.allCandidateImages.length > 0) {
      context.main_image_url = result.allCandidateImages[0];
    }

    // Detect category hint from title/URL
    if (!context.category_hint && context.title) {
      const text = (context.title + ' ' + window.location.pathname).toLowerCase();
      for (const cat of CATEGORY_WORDS) {
        if (text.includes(cat)) {
          context.category_hint = cat;
          break;
        }
      }
    }

    // Success if we have at least title or image
    if (context.title || context.main_image_url) {
      result.success = true;
      result.context = context;
    } else {
      result.error = 'Could not extract product information from this page';
    }

  } catch (e) {
    result.error = e.message || 'Extraction failed';
  }

  return result;
}

// Export for use by content script
if (typeof window !== 'undefined') {
  window.AzyahExtractor = { extractProduct };
}
