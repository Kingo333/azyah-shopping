
import React, { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform, animate } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/hooks/useWishlist';
import { useNavigate } from 'react-router-dom';
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
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 30, mass: 0.8 }
  },
  exit: (direction: { x: number; y: number }) => ({
    x: direction.x,
    y: direction.y,
    opacity: 0,
    scale: 0.9,
    rotate: direction.x * 0.1,
    transition: { 
      type: "spring", 
      stiffness: 300, 
      damping: 25,
      mass: 0.5
    }
  })
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
  const { addToWishlist, isLoading: wishlistLoading } = useWishlist();
  
  // Motion values with improved physics
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-20, 0, 20]);
  const opacity = useTransform(
    x, 
    [-300, -150, 0, 150, 300], 
    [0.5, 1, 1, 1, 0.5]
  );

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

  // Navigation with cleanup and memory optimization
  const nextCard = useCallback((direction?: { x: number; y: number }) => {
    if (currentProduct) {
      addSeenProduct(currentProduct.id);
    }
    
    if (direction) {
      setExitDirection(direction);
    }
    
    // Small delay to allow exit animation
    setTimeout(() => {
      x.set(0);
      y.set(0);
      setIndex(prevIndex => Math.min(prevIndex + 1, products.length));
      performCleanup();
      
      if (index % 50 === 0) {
        optimizeMemory();
      }
    }, 50);
  }, [x, y, products.length, performCleanup, currentProduct, addSeenProduct, optimizeMemory, index]);


  // Optimized action handlers with haptics
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
    nextCard({ x: 300, y: 0 });

    queueMicrotask(async () => {
      try {
        const viewDuration = getViewDuration(product.id);
        
        trackSwipe({
          productId: product.id,
          action: 'right',
          product,
          viewDuration,
          confidence: 1.0
        }).catch(() => {});

        const { error } = await supabase.from('likes').insert([{
          user_id: user.id,
          product_id: product.id
        }]);

        if (error && error.code !== '23505') {
          console.warn("Like error:", error);
        } else if (!error) {
          toast({ 
            description: `Added to likes!`,
            duration: 2000
          });
        }
      } catch (error) {
        // Silent fail
      }
    });
  }, [user, toast, nextCard, trackSwipe, getViewDuration]);

  const handleDislike = useCallback(() => {
    swipeHaptics.dislike();
    
    if (currentProduct) {
      const viewDuration = getViewDuration(currentProduct.id);
      
      if (user) {
        queueMicrotask(() => {
          trackSwipe({
            productId: currentProduct.id,
            action: 'left',
            product: currentProduct,
            viewDuration,
            confidence: 1.0
          }).catch(() => {});
        });
      }
    }
    
    nextCard({ x: -300, y: 0 });
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
    nextCard({ x: 0, y: -300 });

    queueMicrotask(async () => {
      try {
        const viewDuration = getViewDuration(product.id);
        
        trackSwipe({
          productId: product.id,
          action: 'up',
          product,
          viewDuration,
          confidence: 1.0
        }).catch(() => {});

        await addToWishlist(product.id);
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

    const { x: offsetX, y: offsetY } = info.offset;
    const { x: velocityX, y: velocityY } = info.velocity;

    // Consider velocity for more natural swipes
    const effectiveX = offsetX + velocityX * 0.1;
    const effectiveY = offsetY + velocityY * 0.1;

    if (effectiveY < -VERTICAL_THRESHOLD && Math.abs(effectiveX) < DISTANCE_THRESHOLD) {
      handleAddToWishlist(currentProduct);
    } else if (effectiveX > DISTANCE_THRESHOLD) {
      handleLike(currentProduct);
    } else if (effectiveX < -DISTANCE_THRESHOLD) {
      handleDislike();
    } else {
      swipeHaptics.return();
      animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
      animate(y, 0, { type: "spring", stiffness: 400, damping: 30 });
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
                  whileDrag: { 
                    scale: 1.05,
                    cursor: "grabbing"
                  },
                  onDragEnd: handleSwipeEnd,
                  variants: cardVariants,
                  initial: "hidden",
                  animate: "visible",
                  exit: "exit",
                  custom: exitDirection
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
