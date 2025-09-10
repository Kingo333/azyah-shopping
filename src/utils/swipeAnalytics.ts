// SwipeAnalytics - Optimized for server-side analytics with minimal client memory usage
// Uses server-side analytics API instead of localStorage to reduce memory footprint
// Maintains compatibility with existing components while improving performance

// Minimal client-side cache (only current session data)
interface ClientAnalyticsCache {
  recentSwipes: Array<{
    productId: string;
    action: string;
    timestamp: number;
  }>;
  lastCleanup: number;
}

const MAX_CLIENT_CACHE = 20; // Drastically reduced from 1000
const CACHE_KEY = 'swipe_session_cache';
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Get minimal client cache
function getClientCache(): ClientAnalyticsCache {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      // Auto-cleanup if too old
      if (Date.now() - data.lastCleanup > CLEANUP_INTERVAL) {
        clearClientCache();
        return getDefaultCache();
      }
      return data;
    }
  } catch (error) {
    console.warn('Failed to parse client analytics cache:', error);
  }
  return getDefaultCache();
}

// Set minimal client cache
function setClientCache(cache: ClientAnalyticsCache) {
  try {
    // Limit cache size aggressively
    if (cache.recentSwipes.length > MAX_CLIENT_CACHE) {
      cache.recentSwipes = cache.recentSwipes.slice(-MAX_CLIENT_CACHE);
    }
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn('Failed to save client analytics cache:', error);
    // If localStorage is full, clear it and try again
    clearClientCache();
  }
}

// Clear client cache
function clearClientCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.warn('Failed to clear client analytics cache:', error);
  }
}

// Get default cache structure
function getDefaultCache(): ClientAnalyticsCache {
  return {
    recentSwipes: [],
    lastCleanup: Date.now()
  };
}

export const SwipeAnalytics = {
  // Track a swipe action (now only caches locally, server handles persistence)
  trackSwipe(userId: string, productId: string, action: 'left' | 'right' | 'up', productData?: any) {
    try {
      const cache = getClientCache();
      
      // Add to minimal client cache for immediate UI feedback
      cache.recentSwipes.push({
        productId,
        action,
        timestamp: Date.now()
      });
      
      // Aggressive cache size management
      if (cache.recentSwipes.length > MAX_CLIENT_CACHE) {
        cache.recentSwipes = cache.recentSwipes.slice(-10); // Keep only last 10
      }
      
      cache.lastCleanup = Date.now();
      setClientCache(cache);
      
      // Note: Server-side persistence handled by useEnhancedSwipeTracking
      // This function now only handles minimal client-side state
      
    } catch (error) {
      console.warn('Failed to track swipe in client cache:', error);
    }
  },

  // Clean up old data (now minimal since we use server-side storage)
  cleanupOldLikes(userId: string) {
    try {
      const cache = getClientCache();
      const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
      
      cache.recentSwipes = cache.recentSwipes.filter(
        swipe => swipe.timestamp > cutoff
      );
      
      cache.lastCleanup = Date.now();
      setClientCache(cache);
    } catch (error) {
      console.warn('Failed to cleanup client cache:', error);
    }
  },

  // Update preferences (deprecated - now handled server-side)
  updatePreferences(userData: any, swipeData: any, weight: number) {
    console.warn('SwipeAnalytics.updatePreferences is deprecated. Preferences are now calculated server-side.');
  },

  // Get user preferences (placeholder - should use useServerSideAnalytics instead)
  getUserPreferences(userId: string) {
    console.warn('SwipeAnalytics.getUserPreferences is deprecated. Use useServerSideAnalytics hook instead.');
    
    // Return minimal client-side data for backward compatibility
    const cache = getClientCache();
    const recentSwipes = cache.recentSwipes;
    
    return {
      categoryPrefs: {},
      brandPrefs: {},
      pricePrefs: {},
      totalSwipes: recentSwipes.length,
      likeRatio: recentSwipes.length > 0 
        ? recentSwipes.filter(s => s.action === 'right' || s.action === 'up').length / recentSwipes.length 
        : 0,
      recentActivity: recentSwipes.slice(-5), // Only last 5 for compatibility
    };
  },

  // Calculate personality score (simplified - server should handle this)
  calculatePersonalityScore(product: any, prefs: any) {
    console.warn('SwipeAnalytics.calculatePersonalityScore is deprecated. Use server-side scoring instead.');
    
    // Return neutral score - server-side analytics should handle this
    return 0.5;
  },

  // Get personalized recommendations (deprecated)
  getPersonalizedRecommendations(userId: string, products: any[]) {
    console.warn('SwipeAnalytics.getPersonalizedRecommendations is deprecated. Use server-side recommendations instead.');
    
    // Return products as-is since server should handle personalization
    return products;
  },

  // Clear all client-side analytics data
  clearAnalyticsData(userId: string) {
    clearClientCache();
  },

  // Get memory usage info for debugging
  getMemoryUsage() {
    try {
      const cache = getClientCache();
      const cacheSize = JSON.stringify(cache).length;
      
      return {
        cacheSize,
        itemCount: cache.recentSwipes.length,
        maxItems: MAX_CLIENT_CACHE,
        lastCleanup: new Date(cache.lastCleanup).toISOString()
      };
    } catch (error) {
      return {
        cacheSize: 0,
        itemCount: 0,
        maxItems: MAX_CLIENT_CACHE,
        lastCleanup: new Date().toISOString(),
        error: error.message
      };
    }
  }
};

export default SwipeAnalytics;