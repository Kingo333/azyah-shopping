/**
 * Azyah Side Panel Logic
 * Updated to use unified deals endpoint with Ximilar tags display
 */

// State
let currentExtraction = null;
let currentResults = null;

// DOM Elements
const elements = {
  authRequired: document.getElementById('auth-required'),
  idleState: document.getElementById('idle-state'),
  productPreview: document.getElementById('product-preview'),
  loadingState: document.getElementById('loading-state'),
  resultsContainer: document.getElementById('results-container'),
  errorState: document.getElementById('error-state'),
  
  previewImage: document.getElementById('preview-image'),
  previewTitle: document.getElementById('preview-title'),
  previewPrice: document.getElementById('preview-price'),
  previewSource: document.getElementById('preview-source'),
  
  // Ximilar tags display
  ximilarTags: document.getElementById('ximilar-tags'),
  
  priceLow: document.getElementById('price-low'),
  priceMedian: document.getElementById('price-median'),
  priceHigh: document.getElementById('price-high'),
  
  // Exact match section
  exactMatchSection: document.getElementById('exact-match-section'),
  exactMatch: document.getElementById('exact-match'),
  
  bestMatchSection: document.getElementById('best-match-section'),
  bestMatch: document.getElementById('best-match'),
  dealsList: document.getElementById('deals-list'),
  azyahSection: document.getElementById('azyah-section'),
  azyahList: document.getElementById('azyah-list'),
  
  errorTitle: document.getElementById('error-title'),
  errorMessage: document.getElementById('error-message'),
};

// Initialize
async function init() {
  // Check auth status
  const authStatus = await sendMessage({ type: 'GET_AUTH_STATUS' });
  
  if (!authStatus.authenticated) {
    showState('authRequired');
    return;
  }
  
  // Check for pending extraction
  const { pendingExtraction, pendingAt } = await chrome.storage.local.get(['pendingExtraction', 'pendingAt']);
  
  if (pendingExtraction && pendingAt && (Date.now() - pendingAt) < 60000) {
    currentExtraction = pendingExtraction;
    await chrome.storage.local.remove(['pendingExtraction', 'pendingAt']);
    
    if (currentExtraction.success) {
      showProductPreview(currentExtraction.context);
    } else {
      showState('idle');
    }
  } else {
    showState('idle');
  }
}

// State management
function showState(state) {
  // Hide all states
  elements.authRequired.classList.add('hidden');
  elements.idleState.classList.add('hidden');
  elements.productPreview.classList.add('hidden');
  elements.loadingState.classList.add('hidden');
  elements.resultsContainer.classList.add('hidden');
  elements.errorState.classList.add('hidden');
  
  // Show requested state
  switch (state) {
    case 'authRequired':
      elements.authRequired.classList.remove('hidden');
      break;
    case 'idle':
      elements.idleState.classList.remove('hidden');
      break;
    case 'preview':
      elements.productPreview.classList.remove('hidden');
      break;
    case 'loading':
      elements.loadingState.classList.remove('hidden');
      break;
    case 'results':
      elements.resultsContainer.classList.remove('hidden');
      break;
    case 'error':
      elements.errorState.classList.remove('hidden');
      break;
  }
}

// Show product preview
function showProductPreview(context) {
  if (context.main_image_url) {
    elements.previewImage.src = context.main_image_url;
    elements.previewImage.classList.remove('hidden');
  } else {
    elements.previewImage.classList.add('hidden');
  }
  
  elements.previewTitle.textContent = context.title || 'Unknown Product';
  
  if (context.price && context.currency) {
    elements.previewPrice.textContent = `${context.currency} ${context.price.toFixed(2)}`;
  } else if (context.price) {
    elements.previewPrice.textContent = `${context.price.toFixed(2)}`;
  } else {
    elements.previewPrice.textContent = 'Price not detected';
  }
  
  elements.previewSource.textContent = context.brand || extractDomain(context.page_url);
  
  // Clear previous Ximilar tags
  if (elements.ximilarTags) {
    elements.ximilarTags.innerHTML = '';
    elements.ximilarTags.classList.add('hidden');
  }
  
  showState('preview');
}

// Extract domain from URL
function extractDomain(url) {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  } catch {
    return 'Unknown';
  }
}

// Search for deals using unified endpoint
async function searchDeals() {
  if (!currentExtraction?.context) {
    showError('No product detected', 'Please try extracting from the page again.');
    return;
  }
  
  showState('loading');
  
  try {
    // Build unified payload
    const payload = {
      source: 'chrome_extension',
      market: 'AE', // TODO: Detect user's market
      page_url: currentExtraction.context.page_url,
      title_hint: currentExtraction.context.title,
      price_hint: currentExtraction.context.price,
      currency_hint: currentExtraction.context.currency,
      image_url: currentExtraction.context.main_image_url,
    };
    
    const result = await sendMessage({
      type: 'SEARCH_UNIFIED',
      payload
    });
    
    if (!result.success) {
      if (result.requiresAuth) {
        showState('authRequired');
        return;
      }
      showError('Search Failed', result.error || 'Unable to find deals.');
      return;
    }
    
    currentResults = result;
    displayResults(result);
    
    // Also search catalog
    if (currentExtraction.context.title) {
      searchCatalog();
    }
    
  } catch (error) {
    showError('Connection Error', error.message);
  }
}

// Display results with Ximilar tags
function displayResults(result) {
  // Display Ximilar tags if available
  if (result.ximilar_tags && elements.ximilarTags) {
    displayXimilarTags(result.ximilar_tags);
  }
  
  // Price verdict
  if (result.price_stats?.valid_count >= 5) {
    elements.priceLow.textContent = formatPrice(result.price_stats.low);
    elements.priceMedian.textContent = formatPrice(result.price_stats.median);
    elements.priceHigh.textContent = formatPrice(result.price_stats.high);
  } else {
    elements.priceLow.textContent = '-';
    elements.priceMedian.textContent = '-';
    elements.priceHigh.textContent = '-';
  }
  
  // Exact match (NEW)
  if (result.exact_match?.found && elements.exactMatchSection) {
    elements.exactMatch.innerHTML = createExactMatchCard(result.exact_match);
    elements.exactMatchSection.classList.remove('hidden');
  } else if (elements.exactMatchSection) {
    elements.exactMatchSection.classList.add('hidden');
  }
  
  // Best match (first result with highest similarity)
  const sortedResults = [...(result.shopping_results || [])].sort((a, b) => 
    (b.similarity_score || 0) - (a.similarity_score || 0)
  );
  
  if (sortedResults.length > 0) {
    const best = sortedResults[0];
    elements.bestMatch.innerHTML = createDealCard(best, true);
    elements.bestMatchSection.classList.remove('hidden');
  } else {
    elements.bestMatchSection.classList.add('hidden');
  }
  
  // Other deals
  const otherDeals = sortedResults.slice(1, 15);
  if (otherDeals.length > 0) {
    elements.dealsList.innerHTML = otherDeals.map(deal => createDealCard(deal)).join('');
  } else {
    elements.dealsList.innerHTML = '<p class="no-results">No additional deals found.</p>';
  }
  
  showState('results');
}

// Display Ximilar tags
function displayXimilarTags(tags) {
  if (!elements.ximilarTags) return;
  
  const tagPills = [];
  
  // Category
  if (tags.subcategory || tags.primary_category) {
    tagPills.push(`<span class="tag-pill category">${tags.subcategory || tags.primary_category}</span>`);
  }
  
  // Colors
  if (tags.colors?.length > 0) {
    for (const color of tags.colors.slice(0, 2)) {
      tagPills.push(`<span class="tag-pill color">${color}</span>`);
    }
  }
  
  // Patterns
  if (tags.patterns?.length > 0) {
    tagPills.push(`<span class="tag-pill pattern">${tags.patterns[0]}</span>`);
  }
  
  // Pattern mode indicator
  if (tags.is_pattern_mode) {
    tagPills.push(`<span class="tag-pill mode">🎨 Pattern Mode</span>`);
  }
  
  if (tagPills.length > 0) {
    elements.ximilarTags.innerHTML = `
      <div class="ximilar-tags-header">Detected attributes:</div>
      <div class="tag-pills">${tagPills.join('')}</div>
    `;
    elements.ximilarTags.classList.remove('hidden');
  }
}

// Search catalog
async function searchCatalog() {
  try {
    const result = await sendMessage({
      type: 'MATCH_CATALOG',
      queryTitle: currentExtraction.context.title,
      category: currentExtraction.context.category_hint,
      priceCents: currentExtraction.context.price ? Math.round(currentExtraction.context.price * 100) : undefined
    });
    
    if (result.success && result.matches?.length > 0) {
      displayCatalogMatches(result.matches);
    }
  } catch (error) {
    console.error('[Azyah Panel] Catalog search error:', error);
  }
}

// Display catalog matches
function displayCatalogMatches(matches) {
  elements.azyahList.innerHTML = matches.map(match => `
    <div class="azyah-card">
      <img src="${match.media_url}" alt="${match.title}" onerror="this.style.display='none'">
      <div class="azyah-card-info">
        <p class="azyah-card-title">${truncate(match.title, 40)}</p>
        <p class="azyah-card-price">${match.currency || 'AED'} ${(match.price_cents / 100).toFixed(0)}</p>
      </div>
    </div>
  `).join('');
  
  elements.azyahSection.classList.remove('hidden');
}

// Create exact match card (NEW)
function createExactMatchCard(match) {
  return `
    <a href="${match.link}" target="_blank" class="deal-card exact">
      <div class="deal-image">
        ${match.thumbnail ? `<img src="${match.thumbnail}" alt="${match.title}" onerror="this.style.display='none'">` : ''}
      </div>
      <div class="deal-info">
        <span class="exact-badge">✓ Original Found</span>
        <p class="deal-source">${match.source || 'Original Source'}</p>
        <p class="deal-title">${truncate(match.title, 50)}</p>
      </div>
    </a>
  `;
}

// Create deal card HTML
function createDealCard(deal, isBest = false) {
  const price = deal.price || (deal.extracted_price ? `AED ${deal.extracted_price}` : 'See price');
  const source = deal.source || extractDomain(deal.link);
  const similarity = deal.similarity_score ? Math.round(deal.similarity_score * 100) : null;
  
  // Show sub-scores if available
  let subScoreHtml = '';
  if (deal.sub_scores && isBest) {
    const pattern = Math.round(deal.sub_scores.pattern * 100);
    const color = Math.round(deal.sub_scores.color * 100);
    subScoreHtml = `
      <div class="sub-scores">
        <span class="sub-score">🎨 ${pattern}%</span>
        <span class="sub-score">🌈 ${color}%</span>
      </div>
    `;
  }
  
  return `
    <a href="${deal.link}" target="_blank" class="deal-card ${isBest ? 'best' : ''} ${deal.is_exact_match ? 'exact-domain' : ''}">
      <div class="deal-image">
        <img src="${deal.thumbnail}" alt="${deal.title}" onerror="this.style.display='none'">
      </div>
      <div class="deal-info">
        <p class="deal-source">${source}</p>
        <p class="deal-title">${truncate(deal.title, 50)}</p>
        <p class="deal-price">${price}</p>
        ${similarity ? `<span class="similarity-badge">${similarity}% match</span>` : ''}
        ${subScoreHtml}
      </div>
    </a>
  `;
}

// Show error state
function showError(title, message) {
  elements.errorTitle.textContent = title;
  elements.errorMessage.textContent = message;
  showState('error');
}

// Screenshot capture fallback
async function captureAndSearch() {
  showState('loading');
  
  try {
    const result = await sendMessage({ type: 'CAPTURE_SCREENSHOT' });
    
    if (!result.success) {
      showError('Screenshot Failed', result.error || 'Could not capture screenshot');
      return;
    }
    
    // Search with base64 image
    const payload = {
      source: 'chrome_extension',
      market: 'AE',
      page_url: currentExtraction?.context?.page_url,
      title_hint: currentExtraction?.context?.title,
      image_base64: result.dataUrl,
    };
    
    const searchResult = await sendMessage({
      type: 'SEARCH_UNIFIED',
      payload
    });
    
    if (!searchResult.success) {
      showError('Search Failed', searchResult.error || 'Unable to find deals.');
      return;
    }
    
    currentResults = searchResult;
    displayResults(searchResult);
    
  } catch (error) {
    showError('Error', error.message);
  }
}

// Utility functions
function formatPrice(value) {
  if (value === null || value === undefined) return '-';
  return `AED ${value.toFixed(0)}`;
}

function truncate(str, length) {
  if (!str) return '';
  return str.length > length ? str.slice(0, length) + '...' : str;
}

function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      resolve(response || {});
    });
  });
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Event listeners
document.getElementById('check-auth-btn')?.addEventListener('click', async () => {
  const authStatus = await sendMessage({ type: 'GET_AUTH_STATUS' });
  if (authStatus.authenticated) {
    init();
  } else {
    alert('Please sign in to your Azyah account first.');
  }
});

document.getElementById('extract-btn')?.addEventListener('click', async () => {
  const tab = await getCurrentTab();
  if (!tab) return;
  
  try {
    const result = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_PRODUCT' });
    if (result?.success) {
      currentExtraction = result;
      showProductPreview(result.context);
    } else {
      showError('Extraction Failed', result?.error || 'Could not extract product from this page.');
    }
  } catch (error) {
    showError('Not a Product Page', 'Please navigate to a product page and try again.');
  }
});

document.getElementById('search-btn')?.addEventListener('click', searchDeals);

document.getElementById('select-image-btn')?.addEventListener('click', async () => {
  const tab = await getCurrentTab();
  if (!tab) return;
  
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'ACTIVATE_IMAGE_SELECTOR' });
  } catch (error) {
    console.error('[Azyah Panel] Select image error:', error);
  }
});

// Screenshot fallback button
document.getElementById('screenshot-btn')?.addEventListener('click', captureAndSearch);

document.getElementById('retry-btn')?.addEventListener('click', () => {
  if (currentExtraction?.success) {
    showProductPreview(currentExtraction.context);
  } else {
    showState('idle');
  }
});

// Listen for selected image
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'IMAGE_SELECTED_FOR_PANEL' && message.imageUrl) {
    if (currentExtraction?.context) {
      currentExtraction.context.main_image_url = message.imageUrl;
      showProductPreview(currentExtraction.context);
    }
  }
});

// Initialize
init();
