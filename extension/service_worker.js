/**
 * Azyah Service Worker
 * Handles API communication and side panel management
 * Now uses unified deals endpoint with Ximilar tagging
 */

const SUPABASE_URL = 'https://klwolsopucgswhtdlsps.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtsd29sc29wdWNnc3dodGRsc3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyNTQ4NTIsImV4cCI6MjA2OTgzMDg1Mn0.t1GFgR9xiIh7PBmoYs_xKLi1fF1iLTF6pqMlLMHowHQ';

// Enable side panel on extension click (with fallback for unsupported contexts)
try {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
} catch (e) {
  console.warn('[Azyah SW] sidePanel behavior not set:', e);
}

// Message handlers
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'OPEN_SIDE_PANEL') {
    // Store extraction for side panel to read
    chrome.storage.local.set({ 
      pendingExtraction: message.extraction,
      pendingAt: Date.now()
    });
    
    // Open side panel
    chrome.sidePanel.open({ tabId: sender.tab.id }).catch(err => {
      console.error('[Azyah SW] Failed to open side panel:', err);
    });
    
    sendResponse({ success: true });
    return;
  }
  
  // NEW: Unified search endpoint
  if (message.type === 'SEARCH_UNIFIED') {
    searchDealsUnified(message.payload).then(result => {
      sendResponse(result);
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
  
  // Legacy: Keep for backwards compatibility
  if (message.type === 'SEARCH_DEALS') {
    // Convert to unified format
    const unifiedPayload = {
      source: 'chrome_extension',
      market: 'AE',
      page_url: message.context?.page_url,
      title_hint: message.context?.title,
      price_hint: message.context?.price,
      currency_hint: message.context?.currency,
      image_url: message.context?.main_image_url,
    };
    
    searchDealsUnified(unifiedPayload).then(result => {
      sendResponse(result);
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
  
  if (message.type === 'MATCH_CATALOG') {
    matchCatalog(message.queryTitle, message.category, message.priceCents).then(result => {
      sendResponse(result);
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
  
  if (message.type === 'GET_AUTH_STATUS') {
    getAuthStatus().then(result => {
      sendResponse(result);
    });
    return true;
  }
  
  if (message.type === 'IMAGE_SELECTED') {
    // Forward to side panel
    chrome.runtime.sendMessage({
      type: 'IMAGE_SELECTED_FOR_PANEL',
      imageUrl: message.imageUrl
    });
    sendResponse({ success: true });
  }
  
  // Screenshot capture for blocked images
  if (message.type === 'CAPTURE_SCREENSHOT') {
    captureScreenshot(sender.tab.id).then(result => {
      sendResponse(result);
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
});

// Get authentication status
async function getAuthStatus() {
  try {
    const { authToken, authExpiry } = await chrome.storage.local.get(['authToken', 'authExpiry']);
    
    if (authToken && authExpiry && Date.now() < authExpiry) {
      return { authenticated: true, token: authToken };
    }
    
    return { authenticated: false };
  } catch (error) {
    return { authenticated: false, error: error.message };
  }
}

// NEW: Unified search endpoint with Ximilar + SerpApi
async function searchDealsUnified(payload) {
  const { authToken } = await chrome.storage.local.get(['authToken']);
  
  if (!authToken) {
    return { 
      success: false, 
      error: 'Please sign in to search for deals',
      requiresAuth: true
    };
  }
  
  try {
    console.log('[Azyah SW] Calling deals-unified:', {
      source: payload.source,
      market: payload.market,
      has_image: !!payload.image_url || !!payload.image_base64,
      has_title: !!payload.title_hint,
    });
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/deals-unified`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify(payload)
    });
    
    if (response.status === 401) {
      // Token expired
      await chrome.storage.local.remove(['authToken', 'authExpiry']);
      return { 
        success: false, 
        error: 'Session expired. Please sign in again.',
        requiresAuth: true
      };
    }
    
    if (response.status === 429) {
      return { 
        success: false, 
        error: 'Too many requests. Please try again in a minute.' 
      };
    }
    
    const data = await response.json();
    
    // Log debug info for tuning
    if (data.debug) {
      console.log('[Azyah SW] Pipeline debug:', {
        ximilar: data.debug.ximilar?.tags_summary,
        timing: data.debug.timing_ms?.total + 'ms',
        filters: data.debug.filters,
      });
    }
    
    return data;
    
  } catch (error) {
    console.error('[Azyah SW] Unified search error:', error);
    return { success: false, error: error.message };
  }
}

// Match against Azyah catalog
async function matchCatalog(queryTitle, category, priceCents) {
  const { authToken } = await chrome.storage.local.get(['authToken']);
  
  if (!authToken) {
    return { success: false, error: 'Authentication required' };
  }
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/deals-match-catalog`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ 
        query_title: queryTitle,
        category,
        price_cents: priceCents,
        limit: 8
      })
    });
    
    const data = await response.json();
    return data;
    
  } catch (error) {
    console.error('[Azyah SW] Catalog match error:', error);
    return { success: false, error: error.message };
  }
}

// Capture screenshot for blocked images
async function captureScreenshot(tabId) {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 85 });
    return { success: true, dataUrl };
  } catch (error) {
    console.error('[Azyah SW] Screenshot capture error:', error);
    return { success: false, error: error.message };
  }
}

// Listen for installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[Azyah] Extension installed');
  }
});

// Listen for auth tokens from web app (external messaging)
chrome.runtime.onMessageExternal.addListener(
  (message, sender, sendResponse) => {
    // Verify sender is from allowed domain
    const senderUrl = sender.url || '';
    if (!senderUrl.includes('lovable.app') && !senderUrl.includes('localhost')) {
      console.warn('[Azyah SW] Unauthorized external message from:', senderUrl);
      sendResponse({ success: false, error: 'Unauthorized origin' });
      return;
    }
    
    console.log('[Azyah SW] External message received:', message.type);
    
    if (message.type === 'SET_AUTH_TOKEN') {
      // Store token in extension storage
      chrome.storage.local.set({
        authToken: message.token,
        authExpiry: message.expiry || (Date.now() + 3600000) // 1 hour default
      }).then(() => {
        console.log('[Azyah SW] Auth token stored successfully');
        sendResponse({ success: true });
      }).catch((error) => {
        console.error('[Azyah SW] Failed to store auth token:', error);
        sendResponse({ success: false, error: error.message });
      });
      return true; // Keep channel open for async response
    }
    
    if (message.type === 'CLEAR_AUTH_TOKEN') {
      chrome.storage.local.remove(['authToken', 'authExpiry']).then(() => {
        console.log('[Azyah SW] Auth token cleared');
        sendResponse({ success: true });
      }).catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
    }
    
    if (message.type === 'PING') {
      // Simple ping to check if extension is installed
      sendResponse({ success: true, extensionId: chrome.runtime.id });
      return;
    }
    
    sendResponse({ success: false, error: 'Unknown message type' });
  }
);
