
import React, { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform, animate } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/hooks/useWishlist';
import { useNavigate } from 'react-router-dom';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useUnifiedProducts } from '@/hooks/useUnifiedProducts';
import { useEnhancedSwipeTracking } from '@/hooks/useEnhancedSwipeTracking';
import { useSwipePerformance } from '@/hooks/useSwipePerformance';
import { useSwipeMemory } from '@/hooks/useSwipeMemory';
import { supabase } from '@/integrations/supabase/client';
import SwipeCard from '@/components/SwipeCard';
import ProductDetailPage from '@/components/ProductDetailPage';
// SwipeInstructions removed - using single action bar in SwipeCard
import { SwipeLoadingCard } from '@/components/SwipeLoadingCard';
import { SwipeEmptyState } from '@/components/SwipeEmptyState';
import { SwipeCelebration } from '@/components/SwipeCelebration';
import { swipeHaptics } from '@/utils/haptics';
import { useGuestGate } from '@/hooks/useGuestGate';
import { GuestActionPrompt } from '@/components/GuestActionPrompt';

interface UserPreferences {
  coverage?: string;
  fit?: string;
  fabric?: string;
  style?: string[];
}

interface SwipeProduct {
  id: string;
  title: string;
  price_cents: number;
  currency: string;
  category_slug: string;
  subcategory_slug?: string;
  image_url?: string;
  media_urls?: any;
  brand_id?: string;
  brand?: { name: string };
  brands?: { name: string };
  retailer?: { name: string };
  tags?: string[];
  attributes?: any;
  is_external?: boolean;
  external_url?: string;
  merchant_name?: string;
  ar_mesh_url?: string;
}

interface SwipeDeckProps {
  filter: string;
  subcategory?: string;
  gender?: string;
  priceRange: {
    min: number;
    max: number;
  };
  searchQuery?: string;
  currency?: string;
  onProductDetailChange?: (isOpen: boolean) => void;
}

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 25 }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { duration: 0.2 }
  }
};

const DISTANCE_THRESHOLD = 120;
const VERTICAL_THRESHOLD = 120;

const SwipeDeck: React.FC<SwipeDeckProps> = ({
  filter,
  subcategory,
  gender,
  priceRange,
  searchQuery,
  currency = 'USD',
  onProductDetailChange
}) => {
  const [index, setIndex] = useState(0);
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<SwipeProduct | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const [exitDirection, setExitDirection] = useState({ x: 0, y: 0 });
  
  // Swipe milestone tracking state
  const [todaySwipeCount, setTodaySwipeCount] = useState(0);
  const [awardedMilestones, setAwardedMilestones] = useState<number[]>([]);
  const [swipedProductIds, setSwipedProductIds] = useState<Set<string>>(new Set());
  
  const MILESTONES: Record<number, number> = { 25: 2, 50: 3, 100: 5 };
  
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToWishlist, isLoading: wishlistLoading } = useWishlist();
  const { requireAuth, showPrompt, setShowPrompt, promptAction } = useGuestGate();
  
  // Motion values - simplified like SwipeableImages
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

  // Custom hooks
  const { products, isLoading } = useUnifiedProducts({
    category: filter || 'all',
    subcategory,
    gender,
    priceRange,
    searchQuery,
    currency
  });

  const { trackSwipe } = useEnhancedSwipeTracking();
  const { trackViewStart, getViewDuration, clearAll, performCleanup } = useSwipePerformance();
  const { addSeenProduct, optimizeMemory } = useSwipeMemory();

  // Fetch user preferences for "Why this" matching
  const { data: userPrefs } = useQuery({
    queryKey: ['user-preferences', user?.id],
    queryFn: async (): Promise<UserPreferences | null> => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('users')
        .select('preferences')
        .eq('id', user.id)
        .single();
      if (error) return null;
      return (data?.preferences as UserPreferences) || null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Generate match reason based on user preferences and product tags
  const getMatchReason = useCallback((product: SwipeProduct): string => {
    if (!userPrefs) return 'Curated for your style';
    
    const tags = product.tags || [];
    const tagsLower = tags.map(t => t.toLowerCase());
    
    // Check coverage preference match
    if (userPrefs.coverage === 'modest' && tagsLower.some(t => t.includes('modest') || t.includes('high coverage'))) {
      return 'Matches your coverage preference';
    }
    
    // Check fit preference match
    if (userPrefs.fit === 'relaxed' && tagsLower.some(t => t.includes('relaxed') || t.includes('oversized') || t.includes('flowy'))) {
      return 'Matches your fit preference';
    }
    if (userPrefs.fit === 'tailored' && tagsLower.some(t => t.includes('tailored') || t.includes('structured') || t.includes('slim'))) {
      return 'Matches your fit preference';
    }
    
    // Check fabric preference match
    if (userPrefs.fabric === 'breathable' && tagsLower.some(t => 
      t.includes('breathable') || t.includes('linen') || t.includes('cotton')
    )) {
      return 'Matches your fabric preference';
    }
    if (userPrefs.fabric === 'stretch' && tagsLower.some(t => t.includes('stretch'))) {
      return 'Matches your fabric preference';
    }
    
    // Check style preference match
    if (userPrefs.style?.length) {
      for (const style of userPrefs.style) {
        if (tagsLower.some(t => t.includes(style.toLowerCase()))) {
          return `Matches your ${style} style`;
        }
      }
    }
    
    return 'Curated for your style';
  }, [userPrefs]);

  const currentProduct = useMemo(() => products[index] || null, [products, index]);

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    // Image loaded - no aspect ratio calculation needed anymore
  }, []);

  // Load swipe milestone state from localStorage on mount
  useEffect(() => {
    if (!user?.id) return;
    const today = new Date().toISOString().split('T')[0];
    const storageKey = `swipe_milestones_${user.id}_${today}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const { count, awarded, products: prods } = JSON.parse(stored);
        setTodaySwipeCount(count || 0);
        setAwardedMilestones(awarded || []);
        setSwipedProductIds(new Set(prods || []));
      } catch (e) {
        // Invalid data, reset
        localStorage.removeItem(storageKey);
      }
    }
  }, [user?.id]);

  // Check and award milestones
  const checkAndAwardMilestone = useCallback(async (newCount: number, newSwipedIds: Set<string>) => {
    if (!user?.id) return;
    const today = new Date().toISOString().split('T')[0];
    
    for (const [milestoneStr, points] of Object.entries(MILESTONES)) {
      const milestone = parseInt(milestoneStr);
      if (newCount >= milestone && !awardedMilestones.includes(milestone)) {
        try {
          await supabase.rpc('award_points', {
            p_action_type: 'swipe_milestone',
            p_source_id: null,
            p_idempotency_key: `swipe_milestone:${user.id}:${today}:${milestone}`,
            p_metadata: { milestone, total_swipes_today: newCount }
          });
          
          setAwardedMilestones(prev => {
            const updated = [...prev, milestone];
            // Persist to localStorage
            localStorage.setItem(`swipe_milestones_${user.id}_${today}`, JSON.stringify({
              count: newCount,
              awarded: updated,
              products: Array.from(newSwipedIds)
            }));
            return updated;
          });
          
          // Subtle toast for milestone
          toast({
            description: `🎉 Swipe milestone: +${points} points!`,
            duration: 2000
          });
          
          // Invalidate points query
          queryClient.invalidateQueries({ queryKey: ['user-points'] });
        } catch (e) {
          // Silent fail - RPC may not support yet or at cap
          console.log('[SwipeDeck] Milestone award failed:', e);
        }
      }
    }
  }, [user?.id, awardedMilestones, toast, queryClient, MILESTONES]);

  // Increment swipe count (call after each successful swipe)
  const incrementSwipeCount = useCallback((productId: string) => {
    if (!user?.id) return;
    
    // Only count unique products
    if (swipedProductIds.has(productId)) return;
    
    const today = new Date().toISOString().split('T')[0];
    const newSwipedIds = new Set(swipedProductIds);
    newSwipedIds.add(productId);
    setSwipedProductIds(newSwipedIds);
    
    setTodaySwipeCount(prev => {
      const newCount = prev + 1;
      
      // Persist to localStorage
      localStorage.setItem(`swipe_milestones_${user.id}_${today}`, JSON.stringify({
        count: newCount,
        awarded: awardedMilestones,
        products: Array.from(newSwipedIds)
      }));
      
      // Check milestones in next tick
      queueMicrotask(() => checkAndAwardMilestone(newCount, newSwipedIds));
      
      return newCount;
    });
  }, [user?.id, swipedProductIds, awardedMilestones, checkAndAwardMilestone]);

  // Navigation with cleanup and memory optimization - simplified
  const nextCard = useCallback(() => {
    if (currentProduct) {
      addSeenProduct(currentProduct.id);
    }
    
    // Immediate index update - no setTimeout
    setIndex(prevIndex => Math.min(prevIndex + 1, products.length));
    
    // Reset motion values immediately
    x.set(0);
    y.set(0);
    
    // Cleanup operations in microtask (non-blocking)
    queueMicrotask(() => {
      performCleanup();
      if (index % 50 === 0) {
        optimizeMemory();
      }
    });
  }, [x, y, products.length, performCleanup, currentProduct, addSeenProduct, optimizeMemory, index]);


  // Optimized action handlers with haptics - immediate UI response
  const handleLike = useCallback(async (product: SwipeProduct) => {
    // Guest gate - check if user needs to sign up
    requireAuth('save likes', async () => {
      if (!user) return;

      swipeHaptics.like();
      nextCard(); // Immediate, no direction parameter

      // ALL heavy operations happen after animation
      queueMicrotask(async () => {
        // Track swipe milestone
        incrementSwipeCount(product.id);
        
        try {
          const viewDuration = getViewDuration(product.id);
          
          const [trackResult, likeResult] = await Promise.all([
            trackSwipe({
              productId: product.id,
              action: 'right',
              product,
              viewDuration,
              confidence: 1.0
            }),
            supabase.from('likes').insert([{
              user_id: user.id,
              product_id: product.id
            }])
          ]);

          // Handle duplicate likes - bump to top
          if (likeResult.error?.code === '23505') {
            // Already liked - update timestamp to bring to top
            await supabase
              .from('likes')
              .update({ created_at: new Date().toISOString() })
              .eq('user_id', user.id)
              .eq('product_id', product.id);
            
            toast({ 
              description: `Already in likes - moved to top!`,
              duration: 2000
            });
          } else {
            toast({ 
              description: `Added to likes!`,
              duration: 2000
            });
          }

          // Invalidate likes cache so Likes page updates
          queryClient.invalidateQueries({ queryKey: ['likes'] });
          queryClient.invalidateQueries({ queryKey: ['liked-products'] });
        } catch (error) {
          // Silent fail
        }
      });
    });
  }, [user, toast, nextCard, trackSwipe, getViewDuration, queryClient, requireAuth]);

  const handleDislike = useCallback(() => {
    swipeHaptics.dislike();
    nextCard(); // Immediate
    
    if (currentProduct && user) {
      queueMicrotask(() => {
        incrementSwipeCount(currentProduct.id);
        const viewDuration = getViewDuration(currentProduct.id);
        trackSwipe({
          productId: currentProduct.id,
          action: 'left',
          product: currentProduct,
          viewDuration,
          confidence: 1.0
        }).catch(() => {});
      });
    }
  }, [user, currentProduct, nextCard, trackSwipe, getViewDuration]);

  const handleAddToWishlist = useCallback(async (product: SwipeProduct) => {
    // Guest gate - check if user needs to sign up
    requireAuth('add to wishlist', async () => {
      if (!user) return;

      swipeHaptics.wishlist();
      nextCard(); // Immediate

      queueMicrotask(async () => {
        incrementSwipeCount(product.id);
        
        try {
          const viewDuration = getViewDuration(product.id);
          
          await Promise.all([
            trackSwipe({
              productId: product.id,
              action: 'up',
              product,
              viewDuration,
              confidence: 1.0
            }),
            addToWishlist(product.id)
          ]);

          toast({ 
            description: `Added to wishlist!`,
            duration: 2000
          });
        } catch (error: any) {
          const errorMessage = error instanceof Error ? error.message : "Failed to add to wishlist.";
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
            duration: 3000
          });
        }
      });
    });
  }, [user, addToWishlist, toast, nextCard, trackSwipe, getViewDuration, requireAuth]);

  const handleSwipeEnd = useCallback((event: any, info: PanInfo) => {
    const currentProduct = products[index];
    if (!currentProduct) return;

    const { offset, velocity } = info;
    const effectiveX = offset.x + velocity.x * 0.1;

    // Only horizontal swipes trigger actions
    let action: 'like' | 'dislike' | null = null;
    
    if (effectiveX > DISTANCE_THRESHOLD) {
      action = 'like';
    } else if (effectiveX < -DISTANCE_THRESHOLD) {
      action = 'dislike';
    }

    // Smooth return to center
    animate(x, 0, { type: "spring", stiffness: 300, damping: 25 });

    // Execute action AFTER animation starts (non-blocking)
    if (action) {
      queueMicrotask(() => {
        if (action === 'like') handleLike(currentProduct);
        else if (action === 'dislike') handleDislike();
      });
    } else {
      swipeHaptics.return();
    }
  }, [x, index, products, handleLike, handleDislike]);

  const handleProductClick = useCallback((product: SwipeProduct) => {
    setSelectedProduct(product);
    setShowProductDetail(true);
    onProductDetailChange?.(true);
  }, [onProductDetailChange]);

  // Reset and cleanup when products change
  useEffect(() => {
    setIndex(0);
    x.set(0);
    y.set(0);
    clearAll();
  }, [products, x, y, clearAll]);

  // Track view start for current product
  useLayoutEffect(() => {
    if (currentProduct) {
      trackViewStart(currentProduct.id);
    }
  }, [currentProduct, trackViewStart]);

  // Auto-hide instructions
  useEffect(() => {
    if (showInstructions && index > 0) {
      const timer = setTimeout(() => setShowInstructions(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [showInstructions, index]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAll();
    };
  }, [clearAll]);

  if (isLoading) {
    return <SwipeLoadingCard />;
  }

  if (products.length === 0) {
    return <SwipeEmptyState onReset={() => window.location.reload()} />;
  }

  if (showProductDetail && selectedProduct) {
    const transformedProduct = {
      ...selectedProduct,
      media_urls: selectedProduct.media_urls,
      brand: selectedProduct.brand?.name 
        ? { name: selectedProduct.brand.name }
        : selectedProduct.brands?.name 
        ? { name: selectedProduct.brands.name }
        : selectedProduct.brands || { name: selectedProduct.merchant_name || 'ASOS' },
      retailer: selectedProduct.retailer,
      price_cents: selectedProduct.price_cents,
      currency: selectedProduct.currency || 'USD'
    };

    return (
      <div className="fixed inset-0 z-50 bg-background">
        <ProductDetailPage
          product={transformedProduct as any}
          onBack={() => {
            setShowProductDetail(false);
            setSelectedProduct(null);
            onProductDetailChange?.(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Card area - fills entire space */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Card stack preview effect - show next 2 cards underneath */}
        <AnimatePresence mode="wait">
          {products.slice(index, index + 3).map((product, i) => {
            if (i === 0) {
              // Current active card - pass match reason
              const matchReason = getMatchReason(product);
              return (
                <SwipeCard
                  key={product.id}
                  product={product}
                  matchReason={matchReason}
                  onLike={handleLike}
                  onDislike={handleDislike}
                  onWishlist={handleAddToWishlist}
                  onProductClick={handleProductClick}
                  onImageLoad={handleImageLoad}
                  wishlistLoading={wishlistLoading}
                  motionProps={{
                    style: { x, rotate, opacity },
                    drag: "x",
                    dragElastic: 0.2,
                    dragConstraints: { left: 0, right: 0 },
                    whileDrag: { 
                      scale: 1.05,
                      cursor: "grabbing"
                    },
                    onDragEnd: handleSwipeEnd,
                    variants: cardVariants,
                    initial: "hidden",
                    animate: "visible",
                    exit: "exit"
                  }}
                />
              );
            } else {
              // Stack preview cards (underneath)
              return (
                <motion.div
                  key={product.id}
                  className="absolute inset-0"
                  initial={{ scale: 1 - (i * 0.03), y: i * 8, opacity: 1 - (i * 0.3) }}
                  animate={{ scale: 1 - (i * 0.03), y: i * 8, opacity: 1 - (i * 0.3) }}
                  style={{ zIndex: -i }}
                >
                  <div className="w-full max-w-md mx-auto h-full flex items-center justify-center">
                    <div className="w-full aspect-[9/13] rounded-3xl bg-card shadow-xl border-0" />
                  </div>
                </motion.div>
              );
            }
          })}
        </AnimatePresence>

        {/* End of deck celebration */}
        {index >= products.length && products.length > 0 && (
          <SwipeCelebration
            onViewLikes={() => navigate("/favorites")}
            onStartOver={() => {
              setIndex(0);
              window.location.reload();
            }}
          />
        )}
        
        {/* Guest Action Prompt */}
        <GuestActionPrompt 
          open={showPrompt} 
          onOpenChange={setShowPrompt} 
          action={promptAction} 
        />
      </div>
    </div>
  );
};

export default SwipeDeck;
