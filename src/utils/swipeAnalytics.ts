// Enhanced algorithm that considers user's interaction patterns
export const SwipeAnalytics = {
  // Enhanced tracking with product metadata
  trackSwipe: async (userId: string, productId: string, action: 'left' | 'right' | 'up', productData?: any) => {
    // Store in local analytics for immediate feedback
    const analytics = JSON.parse(localStorage.getItem('swipeAnalytics') || '{}');
    
    if (!analytics[userId]) {
      analytics[userId] = {
        likes: [],
        passes: [],
        wishlists: [],
        patterns: {},
        categoryPrefs: {},
        brandPrefs: {},
        pricePrefs: { low: 0, medium: 0, high: 0 }
      };
    }
    
    const timestamp = Date.now();
    const swipeData = {
      productId,
      timestamp,
      productData: productData ? {
        category: productData.category_slug,
        brand: productData.brands?.name || 'Unbranded',
        price_cents: productData.price_cents,
        title: productData.title
      } : null
    };
    
    switch (action) {
      case 'right': // Like
        analytics[userId].likes.push(swipeData);
        SwipeAnalytics.updatePreferences(analytics[userId], swipeData, 2);
        break;
      case 'left': // Pass
        analytics[userId].passes.push(swipeData);
        SwipeAnalytics.updatePreferences(analytics[userId], swipeData, -1);
        break;
      case 'up': // Wishlist
        analytics[userId].wishlists.push(swipeData);
        SwipeAnalytics.updatePreferences(analytics[userId], swipeData, 3);
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
  
  // Update user preferences based on interaction
  updatePreferences: (userData: any, swipeData: any, weight: number) => {
    if (!swipeData.productData) return;
    
    const { category, brand, price_cents } = swipeData.productData;
    
    // Update category preferences
    if (category) {
      userData.categoryPrefs[category] = (userData.categoryPrefs[category] || 0) + weight;
    }
    
    // Update brand preferences
    if (brand) {
      userData.brandPrefs[brand] = (userData.brandPrefs[brand] || 0) + weight;
    }
    
    // Update price preferences
    if (price_cents) {
      const price = price_cents / 100;
      const priceCategory = price < 50 ? 'low' : price < 200 ? 'medium' : 'high';
      userData.pricePrefs[priceCategory] += weight;
    }
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
      categoryPrefs: data.categoryPrefs || {},
      brandPrefs: data.brandPrefs || {},
      pricePrefs: data.pricePrefs || { low: 0, medium: 0, high: 0 },
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
    
    // Base randomness for variety
    score += Math.random() * 0.3;
    
    // Category preference scoring
    const categoryScore = prefs.categoryPrefs[product.category_slug] || 0;
    score += categoryScore * 0.3;
    
    // Brand preference scoring
    const brandName = product.brands?.name || 'Unbranded';
    const brandScore = prefs.brandPrefs[brandName] || 0;
    score += brandScore * 0.25;
    
    // Price preference scoring
    if (product.price_cents) {
      const price = product.price_cents / 100;
      const priceCategory = price < 50 ? 'low' : price < 200 ? 'medium' : 'high';
      const priceScore = prefs.pricePrefs[priceCategory] || 0;
      score += priceScore * 0.2;
    }
    
    // Style tags preferences
    if (product.tags && Array.isArray(product.tags)) {
      product.tags.forEach((tag: string) => {
        const tagPref = prefs.categoryPrefs[tag] || 0;
        score += tagPref * 0.1;
      });
    }
    
    // Recency boost for newer products
    const productAge = Date.now() - new Date(product.created_at).getTime();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    score += Math.max(0, (maxAge - productAge) / maxAge) * 0.15;
    
    // Boost for user engagement patterns
    if (prefs.likesToPassRatio > 1.5) score += 0.1; // User likes most things
    if (prefs.wishlistToLikeRatio > 0.3) score += 0.05; // User wishlists often
    
    return Math.max(0, score);
  }
};

export default SwipeAnalytics;
