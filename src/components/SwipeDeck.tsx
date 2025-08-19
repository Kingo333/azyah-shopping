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
import { Product } from '@/types';
import { useNavigate } from 'react-router-dom';
import { TopCategory, SubCategory } from '@/lib/categories';
import { useSmartSwipeProducts } from '@/hooks/useSmartSwipeProducts';
import { supabase } from '@/integrations/supabase/client';

interface SwipeDeckProps {
  filter: string;
  subcategory: string;
  priceRange: {
    min: number;
    max: number;
  };
  searchQuery: string;
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
  priceRange,
  searchQuery,
  currency = 'USD'
}) => {
  const [index, setIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
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

  // Use the smart swipe products hook with 70/30 personalization
  const { products, isLoading } = useSmartSwipeProducts({
    filter: filter || 'all',
    subcategory,
    priceRange,
    searchQuery,
    currency
  });

  const currentProduct = useMemo(() => products[index], [products, index]);
  const { addToWishlist, isLoading: wishlistLoading } = useWishlist(currentProduct?.id);

  // Calculate image height based on aspect ratio with better mobile optimization
  const getImageHeight = useCallback((aspectRatio: number) => {
    const isMobile = window.innerWidth < 640;
    
    if (isMobile) {
      // For mobile, allow more image space for long images and ensure details fit below
      const availableHeight = window.innerHeight * 0.8; // Use more of the screen
      const detailsMinHeight = 120; // Minimum space needed for details
      const maxImageHeight = availableHeight - detailsMinHeight;
      const minHeight = 280; // Increased minimum for better visibility
      const calculatedHeight = 320 / aspectRatio;
      
      return Math.max(minHeight, Math.min(maxImageHeight, calculatedHeight));
    } else {
      // Desktop: make longer images smaller while keeping whole image visible
      const maxHeight = window.innerHeight * 0.55; // Reduced from 0.7 to give more space for details
      const minHeight = 200;
      const calculatedHeight = 400 / aspectRatio;
      
      // For very long images (tall aspect ratio), limit height more
      if (aspectRatio < 0.6) {
        return Math.max(minHeight, Math.min(window.innerHeight * 0.35, calculatedHeight));
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

  // Reset index when products change
  useEffect(() => {
    setIndex(0);
    x.set(0);
    y.set(0);
  }, [products, x, y]);

  const prevCard = useCallback(() => {
    x.set(0);
    y.set(0);
    setIndex(prevIndex => Math.max(prevIndex - 1, 0));
  }, [x, y]);

  const handleLike = useCallback((product: Product) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "You must be signed in to like products.",
        variant: "destructive"
      });
      return;
    }

    // Move to next card IMMEDIATELY for instant animation
    nextCard();

    // Record swipe for analytics
    supabase.from('swipes').insert([{
      user_id: user.id,
      product_id: product.id,
      action: 'right'
    }]);

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
  }, [user, toast, nextCard]);

  const handleDislike = useCallback(() => {
    if (user && currentProduct) {
      // Record swipe for analytics
      supabase.from('swipes').insert([{
        user_id: user.id,
        product_id: currentProduct.id,
        action: 'left'
      }]);
    }
    nextCard();
  }, [user, currentProduct, nextCard]);

  const handleAddToWishlist = useCallback(async (product: Product) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "You must be signed in to add to wishlist.",
        variant: "destructive"
      });
      return;
    }

    // Record swipe for analytics
    if (user) {
      supabase.from('swipes').insert([{
        user_id: user.id,
        product_id: product.id,
        action: 'up'
      }]);
    }

    // Move to next card immediately for smooth animation
    nextCard();

    // Handle async operation in background
    try {
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
  }, [user, addToWishlist, toast, nextCard]);

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


  const handleProductClick = (product: Product) => {
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
              <CardContent className="p-3 sm:p-4 flex flex-col h-full overflow-y-auto pointer-events-none">
                <div 
                  className="relative w-full mb-3 sm:mb-4 overflow-hidden rounded-md flex-shrink-0"
                  style={{
                    height: `${getImageHeight(imageAspectRatio)}px`
                  }}
                >
                  <img
                    src={currentProduct.media_urls?.[0] || '/placeholder.svg'}
                    alt={currentProduct.title}
                    className="object-contain w-full h-full"
                    onLoad={handleImageLoad}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                </div>
                <div className="flex flex-col flex-grow">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 flex-1">
                      <h3 className="text-base sm:text-lg font-semibold line-clamp-2">{currentProduct.title}</h3>
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
                  <p className="text-sm sm:text-sm text-muted-foreground line-clamp-1 mb-2">{currentProduct.brand?.name}</p>
                  <div className="flex items-center justify-between mb-auto">
                    <span className="text-xl sm:text-xl font-bold">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: currentProduct.currency || 'USD'
                      }).format(currentProduct.price_cents / 100)}
                    </span>
                    <div className="flex items-center gap-2">
                      {currentProduct.ar_mesh_url && (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Sparkles className="h-3 w-3" />
                          AR Ready
                        </Badge>
                      )}
                      {/* Action Circles */}
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDislike();
                          }}
                          className="h-10 w-10 rounded-full bg-destructive/10 hover:bg-destructive/20 pointer-events-auto"
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
                          className="h-10 w-10 rounded-full bg-accent/10 hover:bg-accent/20 pointer-events-auto"
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
                          className="h-10 w-10 rounded-full bg-primary/10 hover:bg-primary/20 pointer-events-auto"
                        >
                          <Heart className="h-5 w-5 text-primary" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Shop Now Button for External Products */}
                  {currentProduct.is_external && currentProduct.external_url && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Track shop now click
                          if (user) {
                            supabase.from('events').insert([{
                              event_type: 'shop_now_click',
                              user_id: user.id,
                              product_id: currentProduct.id,
                              event_data: { source: 'swipe_deck', external_url: currentProduct.external_url }
                            }]);
                          }
                          window.open(currentProduct.external_url, '_blank', 'noopener,noreferrer');
                        }}
                        className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-semibold shadow-lg pointer-events-auto"
                        size="sm"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Shop Now on {currentProduct.merchant_name || 'ASOS'}
                      </Button>
                    </div>
                  )}
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
      <ProductDetailModal
        product={selectedProduct!}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProduct(null);
        }}
      />
    </div>
  );
};

export default SwipeDeck;
