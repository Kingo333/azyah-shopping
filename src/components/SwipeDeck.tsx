import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform, animate } from 'framer-motion';
import { Heart, X, RotateCcw, Sparkles, ShoppingBag, TrendingUp, Users, Star, ExternalLink, Camera, Search, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/hooks/useWishlist';
import ProductDetailModal from '@/components/ProductDetailModal';
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
  brands?: { name: string };
  tags?: string[];
  attributes?: any;
  is_external?: boolean;
  external_url?: string;
  merchant_name?: string;
  ar_mesh_url?: string;
}
import { useNavigate } from 'react-router-dom';
import { TopCategory, SubCategory } from '@/lib/categories';
import { useEnhancedSwipeProducts } from '@/hooks/useEnhancedSwipeProducts';
import { useEnhancedSwipeTracking } from '@/hooks/useEnhancedSwipeTracking';
import { getResponsiveImageProps } from '@/utils/asosImageUtils';
import { supabase } from '@/integrations/supabase/client';

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
}

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 50
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5
    }
  },
  exit: (x: number) => ({
    x: x,
    opacity: 0,
    transition: {
      duration: 0.5
    }
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
  currency = 'USD'
}) => {
  const [index, setIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<SwipeProduct | null>(null);
  const [imageAspectRatio, setImageAspectRatio] = useState<number>(1);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-45, 0, 45]);
  const opacity = useTransform(x, [-200, 0, 200], [0, 1, 0]);
  const scale = useTransform(x, [-200, 0, 200], [0.8, 1, 0.8]);
  const cardRef = useRef<HTMLDivElement>(null);

  // Use the enhanced swipe products hook with AI-powered personalization
  const { products, isLoading } = useEnhancedSwipeProducts({
    filter: filter || 'all',
    subcategory,
    gender,
    priceRange: [priceRange.min, priceRange.max],
    searchQuery,
    currency
  });

  const { trackSwipe, trackViewDuration } = useEnhancedSwipeTracking();

  // Track view start times for implicit feedback
  const [viewStartTimes, setViewStartTimes] = useState<Map<string, number>>(new Map());

  const currentProduct = useMemo(() => products[index] || null, [products, index]);
  const { addToWishlist, isLoading: wishlistLoading } = useWishlist(currentProduct?.id);

  // Calculate image height based on aspect ratio with better mobile optimization
  const getImageHeight = useCallback((aspectRatio: number) => {
    const isMobile = window.innerWidth < 640;
    
    if (isMobile) {
      // For mobile, ensure content below image has enough space
      const availableHeight = window.innerHeight * 0.75; // Reduced from 0.8
      const contentMinHeight = 160; // Increased minimum space for content (title, brand, price, buttons)
      const maxImageHeight = availableHeight - contentMinHeight;
      const minHeight = 240; // Reduced minimum height
      const calculatedHeight = 280 / aspectRatio; // Reduced base width
      
      return Math.max(minHeight, Math.min(maxImageHeight, calculatedHeight));
    } else {
      // Desktop: ensure all content fits well
      const maxHeight = window.innerHeight * 0.45; // Reduced from 0.55
      const minHeight = 180; // Reduced minimum
      const calculatedHeight = 320 / aspectRatio; // Reduced base width
      
      // For very long images (tall aspect ratio), limit height more aggressively
      if (aspectRatio < 0.6) {
        return Math.max(minHeight, Math.min(window.innerHeight * 0.3, calculatedHeight));
      }
      
      return Math.max(minHeight, Math.min(maxHeight, calculatedHeight));
    }
  }, []);

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const ratio = img.naturalWidth / img.naturalHeight;
    setImageAspectRatio(ratio);
  }, []);

  const nextCard = useCallback(() => {
    x.set(0);
    y.set(0);
    setIndex(prevIndex => Math.min(prevIndex + 1, products.length - 1));
  }, [x, y, products.length]);

  // Reset index when products change and track view times
  useEffect(() => {
    setIndex(0);
    x.set(0);
    y.set(0);
    setViewStartTimes(new Map());
  }, [products, x, y]);

  // Track view start time for current product
  useEffect(() => {
    if (currentProduct) {
      setViewStartTimes(prev => new Map(prev.set(currentProduct.id, Date.now())));
    }
  }, [index, currentProduct]);

  const prevCard = useCallback(() => {
    x.set(0);
    y.set(0);
    setIndex(prevIndex => Math.max(prevIndex - 1, 0));
  }, [x, y]);

  const handleLike = useCallback(async (product: SwipeProduct) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "You must be signed in to like products.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Track view duration for implicit feedback
      const viewDuration = trackViewDuration(product.id, viewStartTimes.get(product.id) || Date.now());
      
      // Track enhanced swipe with metadata
      await trackSwipe({
        productId: product.id,
        action: 'right',
        product,
        viewDuration,
        confidence: 1.0
      });

      // Move to next card IMMEDIATELY for instant animation
      nextCard();

      // Fire-and-forget database operation (no await, no blocking)
      supabase.from('likes').insert([{
        user_id: user.id,
        product_id: product.id
      }]).then(({ error }) => {
        if (error) {
          if (error.code === '23505') {
            toast({
              description: `${product.title} is already in your likes!`
            });
          } else {
            console.error("Error liking product:", error.message);
            toast({
              title: "Error",
              description: "Failed to like product. Please try again.",
              variant: "destructive"
            });
          }
        } else {
          toast({
            description: `${product.title} added to your likes!`
          });
        }
      });
    } catch (error) {
      console.error('Error tracking like:', error);
      // Still move to next card even if tracking fails
      nextCard();
    }
  }, [user, toast, nextCard, trackSwipe, trackViewDuration, viewStartTimes]);

  const handleDislike = useCallback(async () => {
    if (user && currentProduct) {
      try {
        // Track view duration for implicit feedback
        const viewDuration = trackViewDuration(currentProduct.id, viewStartTimes.get(currentProduct.id) || Date.now());
        
        // Track enhanced swipe with metadata
        await trackSwipe({
          productId: currentProduct.id,
          action: 'left',
          product: currentProduct,
          viewDuration,
          confidence: 1.0
        });
      } catch (error) {
        console.error('Error tracking dislike:', error);
      }
    }
    nextCard();
  }, [user, currentProduct, nextCard, trackSwipe, trackViewDuration, viewStartTimes]);

  const handleAddToWishlist = useCallback(async (product: SwipeProduct) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "You must be signed in to add to wishlist.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Track view duration for implicit feedback
      const viewDuration = trackViewDuration(product.id, viewStartTimes.get(product.id) || Date.now());
      
      // Track enhanced swipe with metadata
      await trackSwipe({
        productId: product.id,
        action: 'up',
        product,
        viewDuration,
        confidence: 1.0
      });

      // Move to next card immediately for smooth animation
      nextCard();

      // Handle async operation in background
      await addToWishlist();
      toast({
        description: `${product.title} added to your wishlist!`
      });
    } catch (error: any) {
      console.error("Error adding to wishlist:", error.message);
      
      // Handle duplicate entry error specifically
      if (error.message.includes('duplicate key value violates unique constraint')) {
        toast({
          description: `${product.title} is already in your wishlist!`
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to add to wishlist. Please try again.",
          variant: "destructive"
        });
      }
    }
  }, [user, addToWishlist, toast, nextCard, trackSwipe, trackViewDuration, viewStartTimes]);

  const handleSwipeEnd = useCallback((event: any, info: PanInfo) => {
    const currentProduct = products[index];
    if (!currentProduct) return;

    const { x: offsetX, y: offsetY } = info.offset;

    // Check for vertical swipe up first (wishlist)
    if (offsetY < -VERTICAL_THRESHOLD && Math.abs(offsetX) < DISTANCE_THRESHOLD) {
      handleAddToWishlist(currentProduct);
    }
    // Then check for horizontal swipes
    else if (offsetX > DISTANCE_THRESHOLD) {
      handleLike(currentProduct);
    } else if (offsetX < -DISTANCE_THRESHOLD) {
      handleDislike();
    } else {
      // Reset position very gently if not swiped far enough
      animate(x, 0, { type: "spring", stiffness: 100, damping: 20 });
      animate(y, 0, { type: "spring", stiffness: 100, damping: 20 });
    }
  }, [x, y, index, products, handleLike, handleDislike, handleAddToWishlist]);


  const handleProductClick = (product: SwipeProduct) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4">
        <Search className="h-10 w-10 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">No products found matching your criteria.</p>
        <Button variant="outline" onClick={() => {
          window.location.reload();
        }}>
          Reset Filters
        </Button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <AnimatePresence initial={false} custom={x.get()}>
        {currentProduct && (
          <motion.div
            key={currentProduct.id}
            ref={cardRef}
            className="absolute top-0 left-0 w-full h-full"
            style={{
              x,
              y,
              rotate,
              opacity,
              scale
            }}
            drag
            dragElastic={false}
            dragMomentum={false}
            whileDrag={{ scale: 1.02 }}
            onDragEnd={handleSwipeEnd}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            custom={x.get()}
          >
            <Card className="h-full flex flex-col cursor-grab active:cursor-grabbing overflow-hidden pointer-events-none">
              <CardContent className="p-3 sm:p-4 flex flex-col h-full pointer-events-none justify-between">
                <div 
                  className="relative w-full mb-3 sm:mb-4 overflow-hidden rounded-md flex-shrink-0"
                  style={{
                    height: `${getImageHeight(imageAspectRatio)}px`
                  }}
                >
                   <img
                    {...getResponsiveImageProps(
                      (() => {
                        // Parse media_urls JSON string and get first URL, fallback to image_url or placeholder
                        try {
                          const mediaUrls = typeof currentProduct.media_urls === 'string' 
                            ? JSON.parse(currentProduct.media_urls)
                            : currentProduct.media_urls;
                          return Array.isArray(mediaUrls) && mediaUrls.length > 0 
                            ? mediaUrls[0] 
                            : currentProduct.image_url || '/placeholder.svg';
                        } catch {
                          return currentProduct.image_url || '/placeholder.svg';
                        }
                      })(),
                      "(max-width: 768px) 100vw, 50vw"
                    )}
                    alt={currentProduct.title}
                    className="object-cover w-full h-full"
                    onLoad={handleImageLoad}
                    onError={(e) => {
                      console.warn('Image failed to load for product:', currentProduct.id);
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                </div>
                
                {/* Content Section - Fixed Height */}
                <div className="flex flex-col space-y-2 flex-shrink-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-semibold line-clamp-1 truncate">{currentProduct.title}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProductClick(currentProduct);
                        }}
                        className="flex-shrink-0 h-7 sm:h-7 px-2 sm:px-2 text-xs hover:bg-accent pointer-events-auto"
                      >
                        <Info className="h-3 w-3 mr-1" />
                        <span className="hidden sm:inline">Details</span>
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{currentProduct.brands?.name}</p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-base sm:text-lg font-bold truncate">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: currentProduct.currency || 'USD'
                      }).format(currentProduct.price_cents / 100)}
                    </span>
                    {currentProduct.ar_mesh_url && (
                      <Badge variant="outline" className="gap-1 text-xs flex-shrink-0">
                        <Sparkles className="h-3 w-3" />
                        <span className="hidden sm:inline">AR Ready</span>
                      </Badge>
                    )}
                  </div>

                  {/* Action Buttons Row - Fixed Size */}
                  <div className="flex items-center justify-center gap-1 pt-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDislike();
                      }}
                      className="h-10 w-10 rounded-full bg-destructive/10 hover:bg-destructive/20 pointer-events-auto flex-shrink-0"
                    >
                      <X className="h-5 w-5 text-destructive" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToWishlist(currentProduct);
                      }}
                      disabled={wishlistLoading}
                      className="h-10 w-10 rounded-full bg-accent/10 hover:bg-accent/20 pointer-events-auto flex-shrink-0"
                    >
                      <ShoppingBag className="h-5 w-5 text-accent-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLike(currentProduct);
                      }}
                      className="h-10 w-10 rounded-full bg-primary/10 hover:bg-primary/20 pointer-events-auto flex-shrink-0"
                    >
                      <Heart className="h-5 w-5 text-primary" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No More Products */}
      {index >= products.length && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <h2 className="text-2xl font-bold text-muted-foreground mb-2">No More Products</h2>
          <p className="text-muted-foreground">You've seen all the products for now.</p>
        </div>
      )}


      {/* Swipe Instructions */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="bg-black/50 text-white text-xs p-2 rounded-lg text-center">
          Swipe ← to pass • Swipe → to like • Swipe ↑ to add to wishlist
        </div>
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct as any}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedProduct(null);
          }}
        />
      )}
    </div>
  );
};

export default SwipeDeck;
