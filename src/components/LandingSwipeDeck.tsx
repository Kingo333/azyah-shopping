
import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, X, ShoppingBag, ExternalLink, Sparkles, Info } from 'lucide-react';
import { useSmartSwipeProducts } from '@/hooks/useSmartSwipeProducts';
import { getResponsiveImageProps } from '@/utils/asosImageUtils';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform, animate } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import ProductDetailPage from '@/components/ProductDetailPage';

interface LandingSwipeDeckProps {
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

const LandingSwipeDeck: React.FC<LandingSwipeDeckProps> = ({
  filter,
  subcategory,
  gender,
  priceRange,
  searchQuery,
  currency = 'USD'
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageAspectRatio, setImageAspectRatio] = useState<number>(1);
  const [showInstructions, setShowInstructions] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showProductDetail, setShowProductDetail] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-45, 0, 45]);
  const opacity = useTransform(x, [-200, 0, 200], [0, 1, 0]);
  const scale = useTransform(x, [-200, 0, 200], [0.8, 1, 0.8]);
  
  const { products, isLoading } = useSmartSwipeProducts({
    filter: filter || 'all',
    subcategory,
    gender,
    priceRange,
    searchQuery,
    currency
  });

  const currentProduct = products[currentIndex] || null;

  // Calculate image height based on aspect ratio with better mobile optimization
  const getImageHeight = useCallback((aspectRatio: number) => {
    const isMobile = window.innerWidth < 640;
    
    if (isMobile) {
      const availableHeight = window.innerHeight * 0.8;
      const detailsMinHeight = 120;
      const maxImageHeight = availableHeight - detailsMinHeight;
      const minHeight = 280;
      const calculatedHeight = 320 / aspectRatio;
      
      return Math.max(minHeight, Math.min(maxImageHeight, calculatedHeight));
    } else {
      const maxHeight = window.innerHeight * 0.55;
      const minHeight = 200;
      const calculatedHeight = 400 / aspectRatio;
      
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
    setCurrentIndex(prevIndex => Math.min(prevIndex + 1, products.length - 1));
  }, [x, y, products.length]);

  const handleLike = useCallback(() => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Create an account to start liking products!",
        variant: "destructive"
      });
      return;
    }
    nextCard();
    toast({
      description: `${currentProduct?.title} added to your likes!`
    });
  }, [user, toast, nextCard, currentProduct]);

  const handleDislike = useCallback(() => {
    nextCard();
  }, [nextCard]);

  const handleAddToWishlist = useCallback(() => {
    if (!user) {
      toast({
        title: "Sign in required", 
        description: "Create an account to start saving products!",
        variant: "destructive"
      });
      return;
    }
    nextCard();
    toast({
      description: `${currentProduct?.title} added to your wishlist!`
    });
  }, [user, nextCard, toast, currentProduct]);

  const handleSwipeEnd = useCallback((event: any, info: PanInfo) => {
    if (!currentProduct) return;

    const { x: offsetX, y: offsetY } = info.offset;
    const { x: velocityX, y: velocityY } = info.velocity;

    // Check for vertical swipe (wishlist)
    if (offsetY < -VERTICAL_THRESHOLD && Math.abs(offsetX) < DISTANCE_THRESHOLD) {
      handleAddToWishlist();
      // Quick animation and immediate reset
      animate(x, 0, { duration: 0.1 });
      animate(y, -window.innerHeight, { duration: 0.15 });
      requestAnimationFrame(() => {
        y.set(0);
      });
    } 
    // Check for right swipe (like)
    else if (offsetX > DISTANCE_THRESHOLD || velocityX > 500) {
      handleLike();
      // Quick animation and immediate reset
      animate(x, window.innerWidth + 200, { duration: 0.15 });
      requestAnimationFrame(() => {
        x.set(0);
        y.set(0);
      });
    } 
    // Check for left swipe (dislike)
    else if (offsetX < -DISTANCE_THRESHOLD || velocityX < -500) {
      handleDislike();
      // Quick animation and immediate reset
      animate(x, -window.innerWidth - 200, { duration: 0.15 });
      requestAnimationFrame(() => {
        x.set(0);
        y.set(0);
      });
    } 
    // Not enough movement, spring back to center
    else {
      animate(x, 0, { type: "spring", stiffness: 500, damping: 50 });
      animate(y, 0, { type: "spring", stiffness: 500, damping: 50 });
    }
  }, [currentProduct, handleLike, handleDislike, handleAddToWishlist, x, y]);

  const getImageUrl = (product: any) => {
    try {
      if (product.media_urls) {
        let mediaUrls = product.media_urls;
        if (typeof mediaUrls === 'string') {
          mediaUrls = JSON.parse(mediaUrls);
        }
        if (Array.isArray(mediaUrls) && mediaUrls.length > 0) {
          return mediaUrls[0];
        }
      }
      return product.image_url || '/placeholder.svg';
    } catch (error) {
      console.warn('Error processing image URL:', error);
      return '/placeholder.svg';
    }
  };

  // Auto-hide instructions after 3 seconds
  React.useEffect(() => {
    if (showInstructions) {
      const timer = setTimeout(() => {
        setShowInstructions(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showInstructions]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p className="text-muted-foreground text-sm">Loading products...</p>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-muted-foreground text-sm mb-4">No products found</p>
        <p className="text-xs text-muted-foreground">Try adjusting your filters</p>
      </div>
    );
  }

  if (!currentProduct) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-muted-foreground text-sm">No more products</p>
      </div>
    );
  }

  // Handle full-page product detail view
  if (showProductDetail && selectedProduct) {
    const transformedProduct = {
      ...selectedProduct,
      media_urls: (() => {
        try {
          const mediaUrls = typeof selectedProduct.media_urls === 'string' 
            ? JSON.parse(selectedProduct.media_urls)
            : selectedProduct.media_urls;
          return Array.isArray(mediaUrls) ? mediaUrls : [selectedProduct.image_url].filter(Boolean);
        } catch {
          return [selectedProduct.image_url].filter(Boolean);
        }
      })(),
      brand: selectedProduct.brand || { name: selectedProduct.merchant_name || 'Unknown' },
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
          }}
        />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <AnimatePresence initial={false} custom={x.get()}>
        {currentProduct && (
          <motion.div
            key={currentProduct.id}
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
            <Card className="h-full lg:h-[105%] flex flex-col cursor-grab active:cursor-grabbing overflow-hidden">
              <CardContent className="p-4 sm:p-6 lg:p-8 lg:pb-12 flex flex-col h-full">
                <div 
                  className="relative w-full mb-2 sm:mb-3 overflow-hidden rounded-lg flex-shrink-0"
                  style={{
                    height: `${getImageHeight(imageAspectRatio)}px`
                  }}
                  onClick={() => setShowInstructions(true)}
                >
                  <img
                    {...getResponsiveImageProps(getImageUrl(currentProduct))}
                    alt={currentProduct.title}
                    className="w-full h-full object-cover"
                    onLoad={handleImageLoad}
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      if (img.src !== '/placeholder.svg') {
                        img.src = '/placeholder.svg';
                      }
                    }}
                  />
                </div>
                
                <div className="flex flex-col flex-grow space-y-1 lg:space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm lg:text-sm font-semibold line-clamp-2 mb-1">{currentProduct.title}</h3>
                      <p className="text-xs lg:text-xs text-muted-foreground line-clamp-1">{currentProduct.brand?.name}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProduct(currentProduct);
                        setShowProductDetail(true);
                      }}
                      className="flex-shrink-0 h-8 px-2 text-xs hover:bg-accent"
                    >
                      <Info className="h-3 w-3 mr-1" />
                      <span className="hidden sm:inline">Details</span>
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-base sm:text-lg font-bold">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: currentProduct.currency || 'USD'
                      }).format(currentProduct.price_cents / 100)}
                    </span>
                    
                    <div className="flex items-center gap-1">
                      {currentProduct.ar_mesh_url && (
                        <Badge variant="outline" className="gap-1 text-xs mr-2">
                          <Sparkles className="h-3 w-3" />
                          AR Ready
                        </Badge>
                      )}
                      
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDislike();
                          }}
                          className="h-8 w-8 rounded-full bg-destructive/10 hover:bg-destructive/20"
                        >
                          <X className="h-3 w-3 text-destructive" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToWishlist();
                          }}
                          className="h-8 w-8 rounded-full bg-accent/10 hover:bg-accent/20"
                        >
                          <ShoppingBag className="h-3 w-3 text-accent-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLike();
                          }}
                          className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20"
                        >
                          <Heart className="h-3 w-3 text-primary" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border">
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const url = currentProduct.external_url;
                        if (url) {
                          // Try window.open first, if it fails due to popup blocker, use location.href
                          const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
                          
                          // Check if popup was blocked
                          if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                            // Popup was blocked, open in same tab
                            window.location.href = url;
                          }
                        } else {
                          // Fallback: search for the product on Google
                          const searchQuery = encodeURIComponent(`${currentProduct.title} ${currentProduct.brand?.name || ''}`);
                          const searchUrl = `https://www.google.com/search?q=${searchQuery}`;
                          const newWindow = window.open(searchUrl, '_blank', 'noopener,noreferrer');
                          
                          if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                            window.location.href = searchUrl;
                          }
                        }
                      }}
                      className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-semibold shadow-lg"
                      size="sm"
                    >
                      Shop Now
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Swipe instructions */}
      {showInstructions && (
        <div className="absolute top-4 left-4 right-4 text-center">
          <div className="bg-black/20 backdrop-blur-sm rounded-lg p-2 text-white text-xs">
            ← Pass • ↑ Save • Like →
          </div>
        </div>
      )}

    </div>
  );
};

export default LandingSwipeDeck;
