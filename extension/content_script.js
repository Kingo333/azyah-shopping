/**
 * Azyah Content Script
 * Injects floating button and handles image selection
 */

// Inject extractor script
const extractorScript = document.createElement('script');
extractorScript.src = chrome.runtime.getURL('lib/extractor.js');
(document.head || document.documentElement).appendChild(extractorScript);

// State
let floatingButton = null;
let imageSelectorActive = false;
let selectedImageUrl = null;

// Create floating button
function createFloatingButton() {
  if (floatingButton) return;
  
  floatingButton = document.createElement('div');
  floatingButton.id = 'azyah-floating-btn';
  floatingButton.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.35-4.35"/>
    </svg>
    <span>Find Deals</span>
  `;
  
  floatingButton.addEventListener('click', handleButtonClick);
  document.body.appendChild(floatingButton);
}

// Handle button click - open side panel
async function handleButtonClick() {
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

// Extract product using injected extractor
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
    
    // Also run extraction directly if module not loaded
    setTimeout(() => {
      if (!window.AzyahExtractor) {
        resolve(runInlineExtraction());
      }
    }, 500);
    
    checkExtractor();
  });
}

// Inline extraction fallback
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

// Image selector mode
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

// Listen for messages from service worker / side panel
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

// Initialize when DOM is ready
function init() {
  // Only show button if page looks like a product page
  const isProductPage = checkIfProductPage();
  
  if (isProductPage) {
    createFloatingButton();
  }
}

function checkIfProductPage() {
  // Check for common product page signals
  const signals = [
    // JSON-LD Product
    document.querySelector('script[type="application/ld+json"]')?.textContent?.includes('"Product"'),
    // OG product type
    document.querySelector('meta[property="og:type"]')?.content?.includes('product'),
    // Common product page URL patterns
    /\/(product|item|dp|p\/|pdp|shop)\//i.test(window.location.pathname),
    // Add to cart button
    document.querySelector('[data-testid*="cart"], [class*="add-to-cart"], button[name*="cart"]'),
    // Price elements
    document.querySelector('[itemprop="price"], [data-testid*="price"]'),
  ];
  
  return signals.filter(Boolean).length >= 1;
}

// Wait for page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
