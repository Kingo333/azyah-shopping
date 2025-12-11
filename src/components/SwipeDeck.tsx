
import React, { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform, animate } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/hooks/useWishlist';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useUnifiedProducts } from '@/hooks/useUnifiedProducts';
import { useEnhancedSwipeTracking } from '@/hooks/useEnhancedSwipeTracking';
import { useSwipePerformance } from '@/hooks/useSwipePerformance';
import { useSwipeMemory } from '@/hooks/useSwipeMemory';
import { supabase } from '@/integrations/supabase/client';
import SwipeCard from '@/components/SwipeCard';
import ProductDetailPage from '@/components/ProductDetailPage';
import { SwipeInstructions } from '@/components/SwipeInstructions';
import { SwipeLoadingCard } from '@/components/SwipeLoadingCard';
import { SwipeEmptyState } from '@/components/SwipeEmptyState';
import { SwipeCelebration } from '@/components/SwipeCelebration';
import { swipeHaptics } from '@/utils/haptics';

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
  
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToWishlist, isLoading: wishlistLoading } = useWishlist();
  
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

  const currentProduct = useMemo(() => products[index] || null, [products, index]);

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    // Image loaded - no aspect ratio calculation needed anymore
  }, []);

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
    if (!user) {
      toast({
        title: "Sign in required",
        description: "You must be signed in to like products.",
        variant: "destructive"
      });
      return;
    }

    swipeHaptics.like();
    nextCard(); // Immediate, no direction parameter

    // ALL heavy operations happen after animation
    queueMicrotask(async () => {
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
  }, [user, toast, nextCard, trackSwipe, getViewDuration, queryClient]);

  const handleDislike = useCallback(() => {
    swipeHaptics.dislike();
    nextCard(); // Immediate
    
    if (currentProduct && user) {
      queueMicrotask(() => {
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
    if (!user) {
      toast({
        title: "Sign in required",
        description: "You must be signed in to add to wishlist.",
        variant: "destructive"
      });
      return;
    }

    swipeHaptics.wishlist();
    nextCard(); // Immediate

    queueMicrotask(async () => {
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
  }, [user, addToWishlist, toast, nextCard, trackSwipe, getViewDuration]);

  const handleSwipeEnd = useCallback((event: any, info: PanInfo) => {
    const currentProduct = products[index];
    if (!currentProduct) return;

    const { offset, velocity } = info;
    const effectiveX = offset.x + velocity.x * 0.1;
    const effectiveY = offset.y + velocity.y * 0.1;

    // Determine action
    let action: 'like' | 'dislike' | 'wishlist' | null = null;
    
    if (effectiveY < -VERTICAL_THRESHOLD && Math.abs(effectiveX) < DISTANCE_THRESHOLD) {
      action = 'wishlist';
    } else if (effectiveX > DISTANCE_THRESHOLD) {
      action = 'like';
    } else if (effectiveX < -DISTANCE_THRESHOLD) {
      action = 'dislike';
    }

    // Smooth return to center (like SwipeableImages)
    animate(x, 0, { type: "spring", stiffness: 300, damping: 25 });
    animate(y, 0, { type: "spring", stiffness: 300, damping: 25 });

    // Execute action AFTER animation starts (non-blocking)
    if (action) {
      queueMicrotask(() => {
        if (action === 'like') handleLike(currentProduct);
        else if (action === 'dislike') handleDislike();
        else if (action === 'wishlist') handleAddToWishlist(currentProduct);
      });
    } else {
      swipeHaptics.return();
    }
  }, [x, y, index, products, handleLike, handleDislike, handleAddToWishlist]);

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
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Swipe instructions overlay */}
      <SwipeInstructions show={showInstructions && index === 0} />
      
      {/* Card stack preview effect - show next 2 cards underneath */}
      <AnimatePresence mode="wait">
        {products.slice(index, index + 3).map((product, i) => {
          if (i === 0) {
            // Current active card
            return (
              <SwipeCard
                key={product.id}
                product={product}
                onLike={handleLike}
                onDislike={handleDislike}
                onWishlist={handleAddToWishlist}
                onProductClick={handleProductClick}
                onImageLoad={handleImageLoad}
                wishlistLoading={wishlistLoading}
                motionProps={{
                  style: { x, y, rotate, opacity },
                  drag: true,
                  dragElastic: 0.2,
                  dragConstraints: { left: 0, right: 0, top: 0, bottom: 0 },
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
                  <div className="w-full aspect-[9/16] rounded-3xl bg-card shadow-xl border-0" />
                </div>
              </motion.div>
            );
          }
        })}
      </AnimatePresence>

      {/* End of deck celebration */}
      {index >= products.length && products.length > 0 && (
        <SwipeCelebration
          onViewLikes={() => navigate("/likes")}
          onStartOver={() => {
            setIndex(0);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
};

export default SwipeDeck;
