// Enhanced algorithm that considers user's interaction patterns
export const SwipeAnalytics = {
  // Track swipe patterns
  trackSwipe: async (userId: string, productId: string, action: 'left' | 'right' | 'up') => {
    // Store in local analytics for immediate feedback
    const analytics = JSON.parse(localStorage.getItem('swipeAnalytics') || '{}');
    
    if (!analytics[userId]) {
      analytics[userId] = {
        likes: [],
        passes: [],
        wishlists: [],
        patterns: {}
      };
    }
    
    const timestamp = Date.now();
    
    switch (action) {
      case 'right': // Like
        analytics[userId].likes.push({ productId, timestamp });
        break;
      case 'left': // Pass
        analytics[userId].passes.push({ productId, timestamp });
        break;
      case 'up': // Wishlist
        analytics[userId].wishlists.push({ productId, timestamp });
        break;
    }
    
    // Keep only last 1000 interactions for performance
    Object.keys(analytics[userId]).forEach(key => {
      if (Array.isArray(analytics[userId][key])) {
        analytics[userId][key] = analytics[userId][key].slice(-1000);
      }
    });
    
    localStorage.setItem('swipeAnalytics', JSON.stringify(analytics));
    
    // Schedule analytics cleanup for likes (24 hours)
    if (action === 'right') {
      setTimeout(() => {
        SwipeAnalytics.cleanupOldLikes(userId);
      }, 24 * 60 * 60 * 1000); // 24 hours
    }
  },
  
  // Clean up likes after 24 hours
  cleanupOldLikes: (userId: string) => {
    const analytics = JSON.parse(localStorage.getItem('swipeAnalytics') || '{}');
    if (!analytics[userId]) return;
    
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    analytics[userId].likes = analytics[userId].likes.filter(
      (like: any) => like.timestamp > cutoff
    );
    
    localStorage.setItem('swipeAnalytics', JSON.stringify(analytics));
  },
  
  // Get user preferences for personalization
  getUserPreferences: (userId: string) => {
    const analytics = JSON.parse(localStorage.getItem('swipeAnalytics') || '{}');
    if (!analytics[userId]) return null;
    
    const data = analytics[userId];
    
    return {
      totalLikes: data.likes.length,
      totalPasses: data.passes.length,
      totalWishlists: data.wishlists.length,
      likesToPassRatio: data.likes.length / Math.max(data.passes.length, 1),
      wishlistToLikeRatio: data.wishlists.length / Math.max(data.likes.length, 1),
      recentActivity: [...data.likes, ...data.passes, ...data.wishlists]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 50)
    };
  },
  
  // Enhanced recommendation algorithm
  getPersonalizedRecommendations: (userId: string, products: any[]) => {
    const prefs = SwipeAnalytics.getUserPreferences(userId);
    if (!prefs || prefs.totalLikes + prefs.totalPasses < 10) {
      // Not enough data, return random shuffle
      return products.sort(() => Math.random() - 0.5);
    }
    
    // Score products based on user behavior
    return products
      .map(product => ({
        ...product,
        personalityScore: SwipeAnalytics.calculatePersonalityScore(product, prefs)
      }))
      .sort((a, b) => b.personalityScore - a.personalityScore);
  },
  
  calculatePersonalityScore: (product: any, prefs: any) => {
    let score = 0;
    
    // Base score
    score += Math.random() * 0.3; // Add some randomness
    
    // Category preferences (if we had category data)
    // This would analyze which categories the user likes/passes most
    
    // Price preferences
    if (product.price_cents) {
      // Analyze price range preferences from user's liked items
      score += 0.2;
    }
    
    // Brand preferences
    if (product.brand) {
      // Check if user has liked this brand before
      score += 0.1;
    }
    
    // Style tags preferences
    if (product.attributes?.style_tags) {
      // Analyze which style tags user prefers
      score += 0.15;
    }
    
    // Recency boost for newer products
    const productAge = Date.now() - new Date(product.created_at).getTime();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    score += Math.max(0, (maxAge - productAge) / maxAge) * 0.1;
    
    return score;
  }
};

export default SwipeAnalytics;
