import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product, SwipeAction, User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { convertSupabaseProduct } from '@/lib/type-utils';

interface PersonalizationEngineProps {
  onRecommendationsUpdate: (products: Product[] | ((prev: Product[]) => Product[])) => void;
  children?: React.ReactNode;
}

interface UserPreferences {
  favorite_colors: string[];
  preferred_categories: string[];
  price_range: { min: number; max: number };
  brand_affinity: Record<string, number>;
  style_preferences: string[];
  size_preferences: Record<string, string>;
}

interface SwipePattern {
  category_preferences: Record<string, number>;
  color_preferences: Record<string, number>;
  price_sensitivity: number;
  brand_loyalty: Record<string, number>;
  style_patterns: string[];
}

export const PersonalizationEngine: React.FC<PersonalizationEngineProps> = ({
  onRecommendationsUpdate,
  children,
}) => {
  const { user } = useAuth();
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [swipePatterns, setSwipePatterns] = useState<SwipePattern | null>(null);
  const [isLearning, setIsLearning] = useState(false);

  // Fetch user swipe history and analyze patterns
  const { data: swipeHistory } = useQuery({
    queryKey: ['swipe-history', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('swipes')
        .select(`
          *,
          product:products(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Analyze swipe patterns to understand user preferences
  const analyzeSwipePatterns = React.useCallback((swipes: any[]) => {
    if (!swipes.length) return null;

    const patterns: SwipePattern = {
      category_preferences: {},
      color_preferences: {},
      price_sensitivity: 0,
      brand_loyalty: {},
      style_patterns: [],
    };

    let totalPrice = 0;
    let likedCount = 0;
    let totalCount = swipes.length;

    swipes.forEach((swipe) => {
      const product = swipe.product;
      if (!product) return;

      const isLike = swipe.action === 'right' || swipe.action === 'up';
      const weight = isLike ? 1 : -0.3; // Negative feedback has less weight

      // Category preferences
      if (product.category_slug) {
        patterns.category_preferences[product.category_slug] = 
          (patterns.category_preferences[product.category_slug] || 0) + weight;
      }

      // Color preferences
      if (product.attributes?.color_primary) {
        patterns.color_preferences[product.attributes.color_primary] = 
          (patterns.color_preferences[product.attributes.color_primary] || 0) + weight;
      }

      // Brand loyalty
      if (product.brand?.name) {
        patterns.brand_loyalty[product.brand.name] = 
          (patterns.brand_loyalty[product.brand.name] || 0) + weight;
      }

      // Price analysis
      if (isLike && product.price_cents) {
        totalPrice += product.price_cents;
        likedCount++;
      }

      // Style patterns
      if (product.attributes?.style_tags && isLike) {
        patterns.style_patterns.push(...product.attributes.style_tags);
      }
    });

    // Calculate price sensitivity
    if (likedCount > 0) {
      patterns.price_sensitivity = totalPrice / likedCount;
    }

    return patterns;
  }, []);

  // Generate personalized recommendations based on patterns
  const generateRecommendations = React.useCallback(async (patterns: SwipePattern) => {
    if (!user) return;

    setIsLearning(true);
    try {
      // Get top preferences
      const topCategories = Object.entries(patterns.category_preferences)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([category]) => category);

      const topColors = Object.entries(patterns.color_preferences)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 2)
        .map(([color]) => color);

      const topBrands = Object.entries(patterns.brand_loyalty)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([brand]) => brand);

      // Query products based on preferences
      let query = supabase
        .from('products')
        .select(`
          *,
          brand:brands(*),
          retailer:retailers(*)
        `)
        .eq('status', 'active')
        .limit(20);

      // Apply category filter
      if (topCategories.length > 0) {
        query = query.in('category_slug', topCategories as any);
      }

      // Apply price range based on sensitivity
      const priceMargin = patterns.price_sensitivity * 0.3; // 30% margin
      if (patterns.price_sensitivity > 0) {
        query = query
          .gte('price_cents', Math.max(0, patterns.price_sensitivity - priceMargin))
          .lte('price_cents', patterns.price_sensitivity + priceMargin);
      }

      const { data: recommendations, error } = await query;

      if (error) throw error;

      // Score and sort recommendations
      const scoredRecommendations = (recommendations || []).map((rawProduct: any) => {
        const product = convertSupabaseProduct(rawProduct);
        let score = 0;

        // Category match bonus
        if (product.category_slug && patterns.category_preferences[product.category_slug]) {
          score += patterns.category_preferences[product.category_slug] * 0.3;
        }

        // Color match bonus
        if (product.attributes?.color_primary && patterns.color_preferences[product.attributes.color_primary]) {
          score += patterns.color_preferences[product.attributes.color_primary] * 0.2;
        }

        // Brand affinity bonus
        if (product.brand?.name && patterns.brand_loyalty[product.brand.name]) {
          score += patterns.brand_loyalty[product.brand.name] * 0.15;
        }

        // Price preference bonus
        if (product.price_cents && patterns.price_sensitivity > 0) {
          const priceDiff = Math.abs(product.price_cents - patterns.price_sensitivity);
          const maxDiff = patterns.price_sensitivity;
          score += (1 - (priceDiff / maxDiff)) * 0.2;
        }

        // Style tag matches
        if (product.attributes?.style_tags && patterns.style_patterns.length > 0) {
          const matchingTags = product.attributes.style_tags.filter(tag => 
            patterns.style_patterns.includes(tag)
          );
          score += matchingTags.length * 0.1;
        }

        // Recency bonus (newer products get slight boost)
        const daysSinceCreated = (Date.now() - new Date(product.created_at).getTime()) / (1000 * 60 * 60 * 24);
        score += Math.max(0, (30 - daysSinceCreated) / 30) * 0.05;

        return { ...product, recommendation_score: score };
      });

      // Sort by score and return top recommendations
      const topRecommendations = scoredRecommendations
        .sort((a, b) => b.recommendation_score - a.recommendation_score)
        .slice(0, 12);

      onRecommendationsUpdate(topRecommendations);

      // Store updated preferences as JSON
      const preferences = {
        favorite_colors: topColors,
        preferred_categories: topCategories,
        price_range: {
          min: Math.max(0, patterns.price_sensitivity - priceMargin),
          max: patterns.price_sensitivity + priceMargin,
        },
        brand_affinity: patterns.brand_loyalty,
        style_preferences: [...new Set(patterns.style_patterns)].slice(0, 10),
        size_preferences: {},
      };

      setUserPreferences(preferences as UserPreferences);

      // Update user preferences in database
      await supabase
        .from('users')
        .update({ preferences: preferences as any })
        .eq('id', user.id);

    } catch (error) {
      console.error('Error generating recommendations:', error);
    } finally {
      setIsLearning(false);
    }
  }, [user, onRecommendationsUpdate]);

  // Real-time learning: update preferences when new swipes occur
  useEffect(() => {
    if (!swipeHistory || swipeHistory.length === 0) return;

    const patterns = analyzeSwipePatterns(swipeHistory);
    if (patterns) {
      setSwipePatterns(patterns);
      generateRecommendations(patterns);
    }
  }, [swipeHistory, analyzeSwipePatterns, generateRecommendations]);

  // Collaborative filtering: find similar users based on public preferences only
  const findSimilarUsers = React.useCallback(async () => {
    if (!user || !swipePatterns) return;

    try {
      // Find users with similar preferences (using stored preferences only, not swipe data)
      const { data: otherUsers } = await supabase
        .from('users')
        .select('id, preferences')
        .neq('id', user.id)
        .not('preferences', 'is', null)
        .limit(50);

      if (!otherUsers) return;

      // Calculate similarity scores based on stored preferences only
      const similarities = otherUsers.map(otherUser => {
        let similarity = 0;
        const otherPrefs = otherUser.preferences as unknown as UserPreferences;

        // Compare category preferences
        if (otherPrefs.preferred_categories) {
          const commonCategories = Object.keys(swipePatterns.category_preferences)
            .filter(cat => otherPrefs.preferred_categories.includes(cat));
          similarity += commonCategories.length * 0.4;
        }

        // Compare price ranges
        if (otherPrefs.price_range && swipePatterns.price_sensitivity > 0) {
          const priceOverlap = Math.max(0, Math.min(
            otherPrefs.price_range.max,
            swipePatterns.price_sensitivity * 1.3
          ) - Math.max(
            otherPrefs.price_range.min,
            swipePatterns.price_sensitivity * 0.7
          ));
          similarity += (priceOverlap / swipePatterns.price_sensitivity) * 0.3;
        }

        return { userId: otherUser.id, similarity };
      }).filter(s => s.similarity > 0.4);

      // Get product recommendations based on similar user preferences
      // Use product data instead of individual swipe behavior
      if (similarities.length > 0) {
        const topCategories = Object.entries(swipePatterns.category_preferences)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([category]) => category);

        // Query products in preferred categories with good ratings
        const { data: recommendedProducts } = await supabase
          .from('products')
          .select(`
            *,
            brand:brands(*),
            retailer:retailers(*)
          `)
          .eq('status', 'active')
          .in('category_slug', topCategories as any)
          .order('created_at', { ascending: false })
          .limit(8);

        if (recommendedProducts) {
          // Merge with existing recommendations
          onRecommendationsUpdate((prevRecommendations: Product[]) => [
            ...recommendedProducts.map(convertSupabaseProduct),
            ...prevRecommendations,
          ]);
        }
      }
    } catch (error) {
      console.error('Error finding similar users:', error);
    }
  }, [user, swipePatterns, onRecommendationsUpdate]);

  // Run collaborative filtering periodically (less frequently)
  useEffect(() => {
    if (swipePatterns && swipeHistory && swipeHistory.length > 10) {
      const timer = setTimeout(findSimilarUsers, 5000);
      return () => clearTimeout(timer);
    }
  }, [swipePatterns, findSimilarUsers, swipeHistory]);

  // Provide context to children
  return (
    <>
      {children}
      {isLearning && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Learning your preferences...</span>
        </div>
      )}
    </>
  );
};

// Hook to access personalization data
export const usePersonalization = () => {
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  
  return {
    recommendations,
    updateRecommendations: setRecommendations,
  };
};