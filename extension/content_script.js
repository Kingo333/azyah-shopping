/**
 * Azyah Content Script
 * Phia-level product detection with Shadow DOM button
 */

// Debug flag for troubleshooting
window.__AZYAH_CONTENT_SCRIPT_LOADED = true;
console.log('[Azyah] Content script loaded on:', window.location.href);

// Inject extractor script into main world for JSON-LD access
const extractorScript = document.createElement('script');
extractorScript.src = chrome.runtime.getURL('lib/extractor.js');
(document.head || document.documentElement).appendChild(extractorScript);

// ============================================================================
// STATE
// ============================================================================

let buttonHost = null;
let imageSelectorActive = false;
let selectedImageUrl = null;
let lastUrl = location.href;
let detectionCleanup = null;

// ============================================================================
// SPA NAVIGATION HANDLER (History API Patching)
// ============================================================================

const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function() {
  originalPushState.apply(this, arguments);
  onUrlChange();
};

history.replaceState = function() {
  originalReplaceState.apply(this, arguments);
  onUrlChange();
};

window.addEventListener('popstate', onUrlChange);

function onUrlChange() {
  const newUrl = location.href;
  if (newUrl === lastUrl) return;
  
  console.log('[Azyah] SPA navigation detected:', newUrl);
  lastUrl = newUrl;
  
  // Cleanup any pending detection
  if (detectionCleanup) {
    detectionCleanup();
    detectionCleanup = null;
  }
  
  // Remove existing button
  removeButtonIfExists();
  
  // Re-run detection after short delay for new DOM
  setTimeout(init, 300);
}

// ============================================================================
// PRODUCT DETECTION (Weighted Strong + Weak Signals)
// ============================================================================

function getStrongSignals() {
  const signals = [];
  
  // 1. JSON-LD with "@type": "Product"
  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of jsonLdScripts) {
    try {
      const data = JSON.parse(script.textContent);
      const hasProduct = JSON.stringify(data).includes('"@type":"Product"') || 
                         JSON.stringify(data).includes('"@type": "Product"');
      if (hasProduct) {
        signals.push('json-ld-product');
        break;
      }
    } catch (e) {}
  }
  
  // 2. URL matches product patterns
  const productUrlPattern = /\/(style|styles|product|products|item|items|dp|prd|pdp|pd|p|buy|shop)\/[^\/]+/i;
  if (productUrlPattern.test(window.location.pathname)) {
    signals.push('url-pattern');
  }
  
  // 3. OG type is product
  const ogType = document.querySelector('meta[property="og:type"]')?.content;
  if (ogType && ogType.toLowerCase().includes('product')) {
    signals.push('og-type-product');
  }
  
  // 4. Canonical URL contains product pattern
  const canonical = document.querySelector('link[rel="canonical"]')?.href || '';
  if (productUrlPattern.test(canonical)) {
    signals.push('canonical-product');
  }
  
  return signals;
}

function getWeakSignals() {
  const signals = [];
  
  // 1. Add to Cart/Bag/Basket or Buy Now button
  const buttons = document.querySelectorAll('button, [role="button"], a.button, a[class*="btn"]');
  for (const btn of buttons) {
    const text = btn.textContent?.toLowerCase() || '';
    if (/add to (cart|bag|basket)|buy now|add to wishlist|اضف إلى السلة/i.test(text)) {
      signals.push('add-to-cart-button');
      break;
    }
  }
  
  // 2. Size selector
  const sizeSelectors = document.querySelectorAll(
    'select[name*="size" i], select[id*="size" i], ' +
    '[aria-label*="size" i], [class*="size-select" i], ' +
    '[data-testid*="size" i], [class*="sizeSelector" i]'
  );
  if (sizeSelectors.length > 0) {
    signals.push('size-selector');
  }
  
  // 3. Quantity input
  const qtyInputs = document.querySelectorAll(
    'input[name*="qty" i], input[name*="quantity" i], ' +
    'input[id*="qty" i], input[id*="quantity" i], ' +
    '[class*="quantity" i], [data-testid*="quantity" i]'
  );
  if (qtyInputs.length > 0) {
    signals.push('quantity-input');
  }
  
  // 4. Price with currency (scan first 15000 chars of body)
  const bodyText = document.body?.innerText?.slice(0, 15000) || '';
  const pricePattern = /\b(AED|USD|GBP|EUR|SAR|QAR|KWD|BHD|OMR|£|\$|€|د\.إ)\s*[\d,.]+\b|\b[\d,.]+\s*(AED|USD|GBP|EUR|SAR|درهم)\b/i;
  if (pricePattern.test(bodyText)) {
    signals.push('price-with-currency');
  }
  
  // 5. itemprop="price" or price data attributes
  const priceElements = document.querySelectorAll(
    '[itemprop="price"], [data-price], [class*="product-price" i], ' +
    '[class*="productPrice" i], [data-testid*="price" i]'
  );
  if (priceElements.length > 0) {
    signals.push('price-element');
  }
  
  return signals;
}

function checkIfProductPage() {
  const strongSignals = getStrongSignals();
  const weakSignals = getWeakSignals();
  
  const hasStrong = strongSignals.length >= 1;
  const hasWeak = weakSignals.length >= 1;
  const isProductPage = hasStrong && hasWeak;
  
  console.log('[Azyah] Detection:', {
    strongSignals,
    weakSignals,
    isProductPage
  });
  
  return isProductPage;
}

// ============================================================================
// FLOATING BUTTON (Shadow DOM - Unbreakable)
// ============================================================================

function createFloatingButton() {
  if (document.getElementById('azyah-fab-host')) {
    console.log('[Azyah] Button already exists');
    return;
  }
  
  console.log('[Azyah] Creating floating button with Shadow DOM');
  
  // Create host element with maximum z-index
  const host = document.createElement('div');
  host.id = 'azyah-fab-host';
  host.style.cssText = `
    position: fixed !important;
    bottom: 24px !important;
    right: 24px !important;
    z-index: 2147483647 !important;
    pointer-events: auto !important;
  `;
  
  // Create shadow root for style isolation
  const shadow = host.attachShadow({ mode: 'open' });
  
  // Inject completely isolated styles + button
  shadow.innerHTML = `
    <style>
      * {
        all: initial;
        box-sizing: border-box;
      }
      .fab {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 20px;
        background: linear-gradient(135deg, #7A143E 0%, #5C1030 100%);
        color: white;
        border: none;
        border-radius: 50px;
        box-shadow: 0 4px 20px rgba(122, 20, 62, 0.4), 0 2px 8px rgba(0, 0, 0, 0.1);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, system-ui, sans-serif;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        animation: slideIn 0.3s ease-out;
        white-space: nowrap;
      }
      .fab:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 24px rgba(122, 20, 62, 0.5), 0 4px 12px rgba(0, 0, 0, 0.15);
      }
      .fab:active {
        transform: translateY(0);
      }
      .fab svg {
        width: 20px;
        height: 20px;
        flex-shrink: 0;
      }
      .fab span {
        display: inline;
      }
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    </style>
    <button class="fab">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.35-4.35"/>
      </svg>
      <span>Find Deals</span>
    </button>
  `;
  
  // Add click handler
  const fabButton = shadow.querySelector('.fab');
  fabButton.addEventListener('click', handleButtonClick);
  
  // Store reference and append to body
  buttonHost = host;
  document.body.appendChild(host);
  
  console.log('[Azyah] Button created successfully');
}

function removeButtonIfExists() {
  const host = document.getElementById('azyah-fab-host');
  if (host) {
    host.remove();
    buttonHost = null;
    console.log('[Azyah] Button removed');
  }
}

// ============================================================================
// BUTTON CLICK HANDLER
// ============================================================================

async function handleButtonClick() {
  console.log('[Azyah] Button clicked');
  
  try {
    // Extract product info
    const extractionResult = await extractProductFromPage();
    
    // Store extraction result for side panel
    await chrome.storage.local.set({ 
      currentExtraction: extractionResult,
      extractedAt: Date.now()
    });
    
    // Send message to open side panel
    chrome.runtime.sendMessage({ 
      type: 'OPEN_SIDE_PANEL',
      extraction: extractionResult
    });
  } catch (error) {
    console.error('[Azyah] Button click error:', error);
  }
}

// ============================================================================
// PRODUCT EXTRACTION
// ============================================================================

function extractProductFromPage() {
  return new Promise((resolve) => {
    // Wait for extractor to be available
    const checkExtractor = () => {
      if (window.AzyahExtractor) {
        const result = window.AzyahExtractor.extractProduct();
        resolve(result);
      } else {
        setTimeout(checkExtractor, 50);
      }
    };
    
    // Also run extraction directly if module not loaded after 500ms
    setTimeout(() => {
      if (!window.AzyahExtractor) {
        resolve(runInlineExtraction());
      }
    }, 500);
    
    checkExtractor();
  });
}

function runInlineExtraction() {
  const result = {
    success: false,
    context: {
      page_url: window.location.href,
      extracted_from: 'chrome_ext',
      extraction_confidence: 'low'
    },
    allCandidateImages: []
  };
  
  // Try OG tags
  const ogTitle = document.querySelector('meta[property="og:title"]')?.content;
  const ogImage = document.querySelector('meta[property="og:image"]')?.content;
  
  if (ogTitle) result.context.title = ogTitle;
  if (ogImage) result.context.main_image_url = ogImage;
  
  // Collect images
  const images = document.querySelectorAll('img');
  for (const img of images) {
    if (img.width >= 100 && img.height >= 100 && img.src && !img.src.includes('data:')) {
      result.allCandidateImages.push(img.src);
    }
  }
  
  if (result.context.title || result.context.main_image_url) {
    result.success = true;
  }
  
  return result;
}

// ============================================================================
// IMAGE SELECTOR MODE
// ============================================================================

function activateImageSelector() {
  if (imageSelectorActive) return;
  imageSelectorActive = true;
  
  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'azyah-image-selector-overlay';
  overlay.innerHTML = `
    <div class="azyah-selector-header">
      <span>Click on any product image</span>
      <button id="azyah-cancel-selector">Cancel</button>
    </div>
  `;
  document.body.appendChild(overlay);
  
  // Add hover effect to images
  const images = document.querySelectorAll('img');
  images.forEach(img => {
    if (img.width >= 80 && img.height >= 80) {
      img.classList.add('azyah-selectable-image');
    }
  });
  
  // Handle image click
  const handleImageClick = (e) => {
    const img = e.target;
    if (img.tagName === 'IMG' && img.classList.contains('azyah-selectable-image')) {
      e.preventDefault();
      e.stopPropagation();
      selectedImageUrl = img.src;
      deactivateImageSelector();
      
      // Notify side panel of selected image
      chrome.runtime.sendMessage({
        type: 'IMAGE_SELECTED',
        imageUrl: selectedImageUrl
      });
    }
  };
  
  document.addEventListener('click', handleImageClick, true);
  
  // Handle cancel
  document.getElementById('azyah-cancel-selector').addEventListener('click', () => {
    deactivateImageSelector();
  });
  
  // Store cleanup function
  window.azyahSelectorCleanup = () => {
    document.removeEventListener('click', handleImageClick, true);
  };
}

function deactivateImageSelector() {
  imageSelectorActive = false;
  
  // Remove overlay
  const overlay = document.getElementById('azyah-image-selector-overlay');
  if (overlay) overlay.remove();
  
  // Remove hover effects
  document.querySelectorAll('.azyah-selectable-image').forEach(img => {
    img.classList.remove('azyah-selectable-image');
  });
  
  // Cleanup
  if (window.azyahSelectorCleanup) {
    window.azyahSelectorCleanup();
    window.azyahSelectorCleanup = null;
  }
}

// ============================================================================
// MESSAGE LISTENER
// ============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTRACT_PRODUCT') {
    extractProductFromPage().then(result => {
      sendResponse(result);
    });
    return true; // Keep channel open for async response
  }
  
  if (message.type === 'ACTIVATE_IMAGE_SELECTOR') {
    activateImageSelector();
    sendResponse({ success: true });
  }
  
  if (message.type === 'GET_CANDIDATE_IMAGES') {
    const images = [];
    document.querySelectorAll('img').forEach(img => {
      if (img.width >= 100 && img.height >= 100 && img.src && !img.src.includes('data:')) {
        images.push({
          src: img.src,
          width: img.width,
          height: img.height
        });
      }
    });
    sendResponse({ images });
  }
});

// ============================================================================
// INIT WITH RETRY (MutationObserver + Interval)
// ============================================================================

function init() {
  console.log('[Azyah] Initializing detection on:', window.location.href);
  
  // Try immediate detection
  if (checkIfProductPage()) {
    console.log('[Azyah] Product page detected immediately');
    createFloatingButton();
    return;
  }
  
  // For dynamic pages, observe DOM changes for up to 5 seconds
  console.log('[Azyah] Watching for product page signals...');
  
  let attempts = 0;
  const maxAttempts = 10;
  const checkIntervalMs = 500;
  
  // MutationObserver for DOM changes
  const observer = new MutationObserver(() => {
    if (checkIfProductPage()) {
      console.log('[Azyah] Product page detected after DOM mutation');
      cleanup();
      createFloatingButton();
    }
  });
  
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
  
  // Interval check as backup (for SPAs that don't trigger mutations)
  const intervalId = setInterval(() => {
    attempts++;
    
    if (checkIfProductPage()) {
      console.log('[Azyah] Product page detected via interval check');
      cleanup();
      createFloatingButton();
      return;
    }
    
    if (attempts >= maxAttempts) {
      console.log('[Azyah] Max attempts reached, not a product page');
      cleanup();
    }
  }, checkIntervalMs);
  
  // Cleanup function
  function cleanup() {
    clearInterval(intervalId);
    observer.disconnect();
    detectionCleanup = null;
  }
  
  // Store cleanup for SPA navigation
  detectionCleanup = cleanup;
  
  // Hard timeout after 5 seconds
  setTimeout(() => {
    if (detectionCleanup) {
      console.log('[Azyah] Detection timeout reached');
      cleanup();
    }
  }, 5000);
}

// ============================================================================
// ENTRY POINT
// ============================================================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
