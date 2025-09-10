
import React, { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform, animate } from 'framer-motion';
import { RotateCcw, Star, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/hooks/useWishlist';
import { useNavigate } from 'react-router-dom';
import { useUnifiedProducts } from '@/hooks/useUnifiedProducts';
import { useEnhancedSwipeTracking } from '@/hooks/useEnhancedSwipeTracking';
import { useSwipePerformance } from '@/hooks/useSwipePerformance';
import { supabase } from '@/integrations/supabase/client';
import SwipeCard from '@/components/SwipeCard';
import ProductDetailPage from '@/components/ProductDetailPage';

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
  hidden: { opacity: 1, y: 0, scale: 1 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0 } },
  exit: (x: number) => ({
    x: x,
    opacity: 0,
    scale: 0.95,
    transition: { type: "spring" as const, stiffness: 300, damping: 25, duration: 0.2 }
  })
};

const DISTANCE_THRESHOLD = 100;
const VERTICAL_THRESHOLD = 100;

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
  const [imageAspectRatio, setImageAspectRatio] = useState<number>(1);
  const [showInstructions, setShowInstructions] = useState(true);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToWishlist, isLoading: wishlistLoading } = useWishlist();
  
  // Motion values
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-45, 0, 45]);
  const opacity = useTransform(x, [-200, 0, 200], [0, 1, 0]);
  const scale = useTransform(x, [-200, 0, 200], [0.8, 1, 0.8]);

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

  const currentProduct = useMemo(() => products[index] || null, [products, index]);

  // Optimized image height calculation with caching
  const imageHeightCache = useRef<Map<string, number>>(new Map());
  
  const getImageHeight = useCallback((aspectRatio: number) => {
    const currentWidth = window.innerWidth;
    const currentHeight = window.innerHeight;
    const cacheKey = `${Math.floor(currentWidth / 50)}-${Math.floor(currentHeight / 50)}-${Math.floor(aspectRatio * 100)}`;
    
    if (imageHeightCache.current.has(cacheKey)) {
      return imageHeightCache.current.get(cacheKey)!;
    }
    
    const isMobile = currentWidth < 640;
    let calculatedHeight: number;
    
    if (isMobile) {
      const availableHeight = currentHeight * 0.85;
      const detailsMinHeight = 130;
      const maxImageHeight = availableHeight - detailsMinHeight;
      const minHeight = 300;
      calculatedHeight = Math.max(minHeight, Math.min(maxImageHeight, 380 / aspectRatio));
    } else {
      const maxHeight = currentHeight * 0.6;
      const minHeight = 260;
      calculatedHeight = Math.max(minHeight, Math.min(maxHeight, 480 / aspectRatio));
      
      if (aspectRatio < 0.6) {
        calculatedHeight = Math.max(minHeight, Math.min(currentHeight * 0.45, 480 / aspectRatio));
      }
    }
    
    // Limit cache size
    if (imageHeightCache.current.size > 10) {
      const firstKey = imageHeightCache.current.keys().next().value;
      imageHeightCache.current.delete(firstKey);
    }
    imageHeightCache.current.set(cacheKey, calculatedHeight);
    
    return calculatedHeight;
  }, []);

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    try {
      const img = e.currentTarget;
      if (img.naturalWidth && img.naturalHeight) {
        const ratio = img.naturalWidth / img.naturalHeight;
        setImageAspectRatio(ratio);
      }
    } catch (error) {
      console.warn('Error calculating image aspect ratio:', error);
    }
  }, []);

  // Navigation with cleanup
  const nextCard = useCallback(() => {
    x.set(0);
    y.set(0);
    setIndex(prevIndex => Math.min(prevIndex + 1, products.length - 1));
    performCleanup(); // Trigger cleanup on each swipe
  }, [x, y, products.length, performCleanup]);

  const prevCard = useCallback(() => {
    x.set(0);
    y.set(0);
    setIndex(prevIndex => Math.max(prevIndex - 1, 0));
  }, [x, y]);

  // Optimized action handlers
  const handleLike = useCallback(async (product: SwipeProduct) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "You must be signed in to like products.",
        variant: "destructive"
      });
      return;
    }

    nextCard();

    // Background operations with minimal impact
    queueMicrotask(async () => {
      try {
        const viewDuration = getViewDuration(product.id);
        
        // Fire-and-forget tracking
        trackSwipe({
          productId: product.id,
          action: 'right',
          product,
          viewDuration,
          confidence: 1.0
        }).catch(() => {});

        // Quick database operation
        const { error } = await supabase.from('likes').insert([{
          user_id: user.id,
          product_id: product.id
        }]);

        if (error && error.code !== '23505') {
          console.warn("Like error:", error);
        } else if (!error) {
          toast({ description: `${product.title} added to your likes!` });
        }
      } catch (error) {
        // Silent fail
      }
    });
  }, [user, toast, nextCard, trackSwipe, getViewDuration]);

  const handleDislike = useCallback(() => {
    if (currentProduct) {
      const viewDuration = getViewDuration(currentProduct.id);
      
      // Fire-and-forget tracking
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
    
    nextCard();
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

    nextCard();

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
        toast({ description: `${product.title} added to your wishlist!` });
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : "Failed to add to wishlist. Please try again.";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
      }
    });
  }, [user, addToWishlist, toast, nextCard, trackSwipe, getViewDuration]);

  const handleSwipeEnd = useCallback((event: any, info: PanInfo) => {
    const currentProduct = products[index];
    if (!currentProduct) return;

    const { x: offsetX, y: offsetY } = info.offset;

    if (offsetY < -VERTICAL_THRESHOLD && Math.abs(offsetX) < DISTANCE_THRESHOLD) {
      handleAddToWishlist(currentProduct);
    } else if (offsetX > DISTANCE_THRESHOLD) {
      handleLike(currentProduct);
    } else if (offsetX < -DISTANCE_THRESHOLD) {
      handleDislike();
    } else {
      animate(x, 0, { type: "spring", stiffness: 150, damping: 20, duration: 0.25 });
      animate(y, 0, { type: "spring", stiffness: 150, damping: 20, duration: 0.25 });
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
    imageHeightCache.current.clear();
  }, [products, x, y, clearAll]);

  // Track view start for current product
  useLayoutEffect(() => {
    if (currentProduct) {
      trackViewStart(currentProduct.id);
    }
  }, [currentProduct, trackViewStart]);

  // Auto-hide instructions
  useEffect(() => {
    if (showInstructions) {
      const timer = setTimeout(() => setShowInstructions(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showInstructions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAll();
      imageHeightCache.current.clear();
    };
  }, [clearAll]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-muted-foreground">Loading products...</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 h-full">
        <Search className="h-10 w-10 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">No products found matching your criteria.</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Reset Filters
        </Button>
      </div>
    );
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
    <div className="relative w-full h-full">
      <AnimatePresence initial={false} custom={x.get()}>
        {currentProduct && (
          <SwipeCard
            key={currentProduct.id}
            product={currentProduct}
            imageHeight={getImageHeight(imageAspectRatio)}
            showInstructions={showInstructions}
            onLike={handleLike}
            onDislike={handleDislike}
            onWishlist={handleAddToWishlist}
            onProductClick={handleProductClick}
            onInstructionsClick={() => setShowInstructions(true)}
            onImageLoad={handleImageLoad}
            wishlistLoading={wishlistLoading}
            motionProps={{
              style: { x, y, rotate, opacity, scale },
              drag: true,
              dragElastic: false,
              dragMomentum: false,
              whileDrag: { scale: 1.02 },
              onDragEnd: handleSwipeEnd,
              variants: cardVariants,
              initial: "hidden",
              animate: "visible",
              exit: "exit",
              custom: x.get()
            }}
          />
        )}
      </AnimatePresence>

      {index >= products.length && products.length > 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-background/95 backdrop-blur-sm rounded-3xl">
          <div className="bg-gradient-accent rounded-full p-4 mb-4">
            <Star className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-xl font-bold mb-2 font-playfair">You've seen everything!</h3>
          <p className="text-muted-foreground mb-4 text-sm">
            Great job exploring! Check your likes or try adjusting your filters for more discoveries.
          </p>
          <div className="flex gap-2">
            <Button 
              onClick={() => navigate("/likes")} 
              variant="outline" 
              size="sm"
              className="gap-2"
            >
              <Star className="h-4 w-4" />
              View Likes
            </Button>
            <Button 
              onClick={() => {
                setIndex(0);
                window.location.reload();
              }} 
              variant="default" 
              size="sm"
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Start Over
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SwipeDeck;
