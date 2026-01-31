import type { ProductContext, WebViewExtractionResult } from '@/types/ProductContext';

/**
 * JavaScript code to inject into WebView for product extraction
 * Follows the priority: JSON-LD → OpenGraph → DOM fallback
 */
export const EXTRACTION_SCRIPT = `
(function() {
  const result = {
    success: false,
    context: null,
    error: null,
    extraction_method: null
  };

  try {
    const context = {
      page_url: window.location.href,
      extracted_from: 'azyah_webview',
      extraction_confidence: 'low'
    };

    // 1. Try JSON-LD Product schema (highest confidence)
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of jsonLdScripts) {
      try {
        const data = JSON.parse(script.textContent || '');
        const products = Array.isArray(data) ? data : [data];
        
        for (const item of products) {
          if (item['@type'] === 'Product' || item['@type']?.includes('Product')) {
            context.title = item.name;
            context.brand = item.brand?.name || item.brand;
            
            // Handle price
            const offer = item.offers?.[0] || item.offers;
            if (offer) {
              context.price = parseFloat(offer.price) || undefined;
              context.currency = offer.priceCurrency;
              context.availability = offer.availability?.split('/').pop();
            }
            
            // Handle images
            if (item.image) {
              const images = Array.isArray(item.image) ? item.image : [item.image];
              context.main_image_url = typeof images[0] === 'string' ? images[0] : images[0]?.url;
              context.image_urls = images.map(img => typeof img === 'string' ? img : img?.url).filter(Boolean);
            }
            
            context.category_hint = item.category;
            context.extraction_confidence = 'high';
            result.extraction_method = 'json_ld';
            break;
          }
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
      // Try common title selectors
      const titleSelectors = [
        'h1[data-testid="product-title"]',
        'h1.product-title',
        '.product-name h1',
        '[itemprop="name"]',
        '.pdp-title',
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
        '.price'
      ];
      
      for (const selector of priceSelectors) {
        const el = document.querySelector(selector);
        if (el?.textContent) {
          const match = el.textContent.replace(/,/g, '').match(/[\\d.]+/);
          if (match) {
            context.price = parseFloat(match[0]);
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
        '.product img'
      ];
      
      for (const selector of imageSelectors) {
        const el = document.querySelector(selector);
        if (el?.src && !el.src.includes('placeholder')) {
          context.main_image_url = el.src;
          break;
        }
      }
      
      if (!result.extraction_method && context.title) {
        context.extraction_confidence = 'low';
        result.extraction_method = 'dom_fallback';
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
})();
`;

/**
 * Parse the result from WebView extraction
 */
export function parseExtractionResult(rawResult: any): WebViewExtractionResult {
  if (!rawResult) {
    return {
      success: false,
      error: 'No extraction result received',
    };
  }

  if (typeof rawResult === 'string') {
    try {
      rawResult = JSON.parse(rawResult);
    } catch {
      return {
        success: false,
        error: 'Failed to parse extraction result',
      };
    }
  }

  return {
    success: rawResult.success ?? false,
    context: rawResult.context as ProductContext | undefined,
    error: rawResult.error,
    extraction_method: rawResult.extraction_method,
  };
}

/**
 * Build a ProductContext from a simple URL paste (fallback mode)
 */
export function buildContextFromUrl(url: string): ProductContext {
  let brand: string | undefined;
  let categoryHint: string | undefined;
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '').toLowerCase();
    
    // Extract brand from known domains
    const brandMap: Record<string, string> = {
      'asos': 'ASOS',
      'nike': 'Nike',
      'zara': 'Zara',
      'hm.com': 'H&M',
      'amazon': 'Amazon',
      'shein': 'Shein',
      'namshi': 'Namshi',
      'noon': 'Noon',
      'ounass': 'Ounass',
      'farfetch': 'Farfetch',
      'ssense': 'SSENSE',
    };
    
    for (const [key, value] of Object.entries(brandMap)) {
      if (hostname.includes(key)) {
        brand = value;
        break;
      }
    }
    
    // Try to extract category from URL path
    const path = urlObj.pathname.toLowerCase();
    const categories = ['dress', 'abaya', 'kaftan', 'shoes', 'bag', 'jacket', 'coat', 'top', 'pants'];
    for (const cat of categories) {
      if (path.includes(cat)) {
        categoryHint = cat;
        break;
      }
    }
  } catch {
    // Ignore URL parsing errors
  }
  
  return {
    page_url: url,
    extracted_from: 'url_paste',
    brand,
    category_hint: categoryHint,
    extraction_confidence: 'low',
  };
}
