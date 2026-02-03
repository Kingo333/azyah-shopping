/**
 * Azyah Content Script
 * Robust product detection with Shadow DOM button + SPA handling
 */

window.__AZYAH_CONTENT_SCRIPT_LOADED = true;
console.log('[Azyah] Content script loaded on:', window.location.href);

// Inject extractor into page context
(() => {
  try {
    const s = document.createElement('script');
    s.src = chrome.runtime.getURL('lib/extractor.js');
    (document.head || document.documentElement).appendChild(s);
  } catch (e) {
    console.warn('[Azyah] Failed to inject extractor:', e);
  }
})();

// State
let lastUrl = location.href;
let detectionCleanup = null;

// Patch history for SPA
(() => {
  const origPush = history.pushState;
  const origReplace = history.replaceState;

  function notify() { setTimeout(onUrlChange, 0); }

  history.pushState = function() { origPush.apply(this, arguments); notify(); };
  history.replaceState = function() { origReplace.apply(this, arguments); notify(); };

  window.addEventListener('popstate', notify);
})();

function onUrlChange() {
  const newUrl = location.href;
  if (newUrl === lastUrl) return;
  lastUrl = newUrl;

  console.log('[Azyah] URL changed:', newUrl);

  if (detectionCleanup) { detectionCleanup(); detectionCleanup = null; }
  removeButtonIfExists();
  setTimeout(init, 400);
}

// ============================================================================
// PRODUCT DETECTION (Weighted Strong + Weak Signals)
// ============================================================================

function getStrongSignals() {
  const signals = [];
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const sc of scripts) {
    try {
      const txt = sc.textContent || '';
      if (!txt.trim()) continue;
      const data = JSON.parse(txt);
      const flat = JSON.stringify(data);
      if (flat.includes('"@type":"Product"') || flat.includes('"@type": "Product"')) {
        signals.push('json-ld-product');
        break;
      }
    } catch (_) {}
  }

  const pat = /\/(style|styles|product|products|item|items|dp|prd|pdp|pd|p|buy|shop)\/[^\/]+/i;
  if (pat.test(location.pathname)) signals.push('url-pattern');

  const ogType = document.querySelector('meta[property="og:type"]')?.content;
  if (ogType && ogType.toLowerCase().includes('product')) signals.push('og-type-product');

  const canonical = document.querySelector('link[rel="canonical"]')?.href || '';
  if (canonical && pat.test(canonical)) signals.push('canonical-product');

  return signals;
}

function getWeakSignals() {
  const signals = [];

  // Expanded button detection with Arabic variants
  const buttons = document.querySelectorAll('button, [role="button"], a, input[type="submit"]');
  for (const el of buttons) {
    const text = (el.textContent || el.getAttribute('value') || '').toLowerCase();
    if (/add to (cart|bag|basket)|buy now|add to trolley|checkout|اضف إلى السلة|أضف للسلة|اشتري الآن/i.test(text)) {
      signals.push('cart-button');
      break;
    }
  }

  // Broader size selector detection
  const sizeEls = document.querySelectorAll('select[name*="size" i], select[id*="size" i], [aria-label*="size" i], [data-testid*="size" i], [class*="size" i]');
  if (sizeEls.length) signals.push('size-selector');

  // Quantity input detection
  const qtyEls = document.querySelectorAll('input[name*="qty" i], input[name*="quantity" i], input[id*="qty" i], input[id*="quantity" i]');
  if (qtyEls.length) signals.push('quantity');

  // Increased body text scan to 20,000 chars
  const bodyText = document.body?.innerText?.slice(0, 20000) || '';
  const pricePat = /\b(AED|USD|GBP|EUR|SAR|QAR|KWD|BHD|OMR|£|\$|€|د\.إ)\s*[\d,.]+\b|\b[\d,.]+\s*(AED|USD|GBP|EUR|SAR|درهم)\b/i;
  if (pricePat.test(bodyText)) signals.push('price-text');

  // Price element detection
  const priceEls = document.querySelectorAll('[itemprop="price"], [data-price], [data-testid*="price" i], [class*="price" i]');
  if (priceEls.length) signals.push('price-element');

  return signals;
}

function checkIfProductPage() {
  const strongSignals = getStrongSignals();
  const weakSignals = getWeakSignals();
  const isProductPage = strongSignals.length >= 1 && weakSignals.length >= 1;
  console.log('[Azyah] Detection:', { strongSignals, weakSignals, isProductPage });
  return isProductPage;
}

// ============================================================================
// FLOATING BUTTON (Shadow DOM - Unbreakable)
// ============================================================================

function createFloatingButton() {
  if (document.getElementById('azyah-fab-host')) return;

  const host = document.createElement('div');
  host.id = 'azyah-fab-host';
  host.style.cssText = `
    position: fixed !important;
    bottom: 24px !important;
    right: 24px !important;
    z-index: 2147483647 !important;
    pointer-events: auto !important;
  `;

  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      * { all: initial; box-sizing: border-box; }
      .fab {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 12px 18px;
        background: linear-gradient(135deg, #7A143E 0%, #5C1030 100%);
        color: #fff;
        border: none;
        border-radius: 999px;
        box-shadow: 0 4px 20px rgba(122, 20, 62, 0.4), 0 2px 8px rgba(0,0,0,0.1);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, system-ui, sans-serif;
        font-size: 14px;
        font-weight: 650;
        cursor: pointer;
        transition: transform .15s ease, box-shadow .15s ease;
        white-space: nowrap;
      }
      .fab:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(122,20,62,.5), 0 4px 12px rgba(0,0,0,.15); }
      .fab:active { transform: translateY(0); }
      .fab svg { width: 20px; height: 20px; flex: 0 0 auto; }
    </style>
    <button class="fab" type="button" aria-label="Find better deals">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="7"></circle>
        <path d="M21 21l-4.3-4.3"></path>
      </svg>
      <span>Find Deals</span>
    </button>
  `;

  shadow.querySelector('.fab')?.addEventListener('click', handleButtonClick);
  document.body.appendChild(host);

  console.log('[Azyah] Button injected');
}

function removeButtonIfExists() {
  document.getElementById('azyah-fab-host')?.remove();
}

// ============================================================================
// BUTTON CLICK HANDLER
// ============================================================================

async function handleButtonClick() {
  try {
    const extraction = await extractProductFromPage();
    await chrome.storage.local.set({ currentExtraction: extraction, extractedAt: Date.now() });
    chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL', extraction });
  } catch (e) {
    console.error('[Azyah] Click handler error:', e);
  }
}

// ============================================================================
// PRODUCT EXTRACTION
// ============================================================================

function extractProductFromPage() {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (window.AzyahExtractor?.extractProduct) {
        try { resolve(window.AzyahExtractor.extractProduct()); }
        catch { resolve(runInlineExtraction()); }
        return;
      }
      if (Date.now() - start > 900) { resolve(runInlineExtraction()); return; }
      setTimeout(tick, 60);
    };
    tick();
  });
}

function runInlineExtraction() {
  const result = {
    success: false,
    context: {
      page_url: location.href,
      extracted_from: 'chrome_ext_inline',
      extraction_confidence: 'low'
    },
    allCandidateImages: []
  };

  const ogTitle = document.querySelector('meta[property="og:title"]')?.content;
  const ogImage = document.querySelector('meta[property="og:image"]')?.content;
  if (ogTitle) result.context.title = ogTitle;
  if (ogImage) result.context.main_image_url = ogImage;

  // Increased image threshold to 120x120px
  document.querySelectorAll('img').forEach(img => {
    if (img.width >= 120 && img.height >= 120 && img.src && !img.src.startsWith('data:')) {
      result.allCandidateImages.push(img.src);
    }
  });

  if (result.context.title || result.context.main_image_url) result.success = true;
  return result;
}

// ============================================================================
// IMAGE SELECTOR MODE
// ============================================================================

let imageSelectorActive = false;

function activateImageSelector() {
  if (imageSelectorActive) return;
  imageSelectorActive = true;

  const overlay = document.createElement('div');
  overlay.id = 'azyah-image-selector-overlay';
  overlay.innerHTML = `
    <div class="azyah-selector-header">
      <span>Click on any product image</span>
      <button id="azyah-cancel-selector" type="button">Cancel</button>
    </div>
  `;
  document.body.appendChild(overlay);

  document.querySelectorAll('img').forEach(img => {
    if (img.width >= 80 && img.height >= 80) img.classList.add('azyah-selectable-image');
  });

  const onClick = (e) => {
    const img = e.target;
    if (img?.tagName === 'IMG' && img.classList.contains('azyah-selectable-image')) {
      e.preventDefault(); e.stopPropagation();
      const url = img.src;
      deactivateImageSelector();
      chrome.runtime.sendMessage({ type: 'IMAGE_SELECTED', imageUrl: url });
    }
  };
  document.addEventListener('click', onClick, true);

  document.getElementById('azyah-cancel-selector')?.addEventListener('click', () => deactivateImageSelector());

  window.__azyahSelectorCleanup = () => document.removeEventListener('click', onClick, true);
}

function deactivateImageSelector() {
  imageSelectorActive = false;
  document.getElementById('azyah-image-selector-overlay')?.remove();
  document.querySelectorAll('.azyah-selectable-image').forEach(img => img.classList.remove('azyah-selectable-image'));
  if (window.__azyahSelectorCleanup) { window.__azyahSelectorCleanup(); window.__azyahSelectorCleanup = null; }
}

// ============================================================================
// MESSAGE LISTENER
// ============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTRACT_PRODUCT') {
    extractProductFromPage().then(sendResponse);
    return true;
  }
  if (message.type === 'ACTIVATE_IMAGE_SELECTOR') {
    activateImageSelector();
    sendResponse({ success: true });
  }
});

// ============================================================================
// INIT WITH RETRY (Extended to 7 seconds)
// ============================================================================

function init() {
  console.log('[Azyah] init() on:', location.href);

  if (checkIfProductPage()) { createFloatingButton(); return; }

  let attempts = 0;
  const maxAttempts = 14; // ~7s (extended from 10/5s)
  const intervalMs = 500;

  const observer = new MutationObserver(() => {
    if (checkIfProductPage()) { cleanup(); createFloatingButton(); }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  const intervalId = setInterval(() => {
    attempts++;
    if (checkIfProductPage()) { cleanup(); createFloatingButton(); return; }
    if (attempts >= maxAttempts) cleanup();
  }, intervalMs);

  function cleanup() {
    clearInterval(intervalId);
    observer.disconnect();
    detectionCleanup = null;
  }
  detectionCleanup = cleanup;

  setTimeout(() => { if (detectionCleanup) cleanup(); }, 7000);
}

// ============================================================================
// ENTRY POINT
// ============================================================================

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
