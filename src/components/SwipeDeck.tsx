import React, { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform, animate } from 'framer-motion';
import { Heart, X, RotateCcw, Sparkles, ShoppingBag, TrendingUp, Users, Star, ExternalLink, Camera, Search, Info, Image } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/hooks/useWishlist';
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
import { useUnifiedProducts } from '@/hooks/useUnifiedProducts';
import { useEnhancedSwipeTracking } from '@/hooks/useEnhancedSwipeTracking';
import { getResponsiveImageProps } from '@/utils/asosImageUtils';
import { getPrimaryImageUrl, hasMultipleImages, getImageCount } from '@/utils/imageHelpers';
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
  onProductDetailChange?: (isOpen: boolean) => void;
}

const cardVariants = {
  hidden: {
    opacity: 1,
    y: 0,
    scale: 1
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0
    }
  },
  exit: (x: number) => ({
    x: x,
    opacity: 0,
    scale: 0.95,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 25,
      duration: 0.2
    }
  })
};

const DISTANCE_THRESHOLD = 100;
const VERTICAL_THRESHOLD = 100;
const MAX_VIEW_ENTRIES = 5; // Reduced from 20
const CLEANUP_INTERVAL = 10000; // 10 seconds instead of 30
const MAX_PERFORMANCE_ENTRIES = 10; // Limit performance data

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
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-45, 0, 45]);
  const opacity = useTransform(x, [-200, 0, 200], [0, 1, 0]);
  const scale = useTransform(x, [-200, 0, 200], [0.8, 1, 0.8]);
  const cardRef = useRef<HTMLDivElement>(null);

  // Use the unified products hook with AI-powered personalization
  const { products, isLoading } = useUnifiedProducts({
    category: filter || 'all',
    subcategory,
    gender,
    priceRange,
    searchQuery,
    currency
  });

  const { trackSwipe, trackViewDuration } = useEnhancedSwipeTracking();

  // Optimized view tracking with aggressive cleanup
  const viewStartTimesRef = useRef<Map<string, number>>(new Map());
  const lastCleanupRef = useRef<number>(Date.now());
  
  // Simplified performance monitoring with bounds
  const performanceMetrics = useRef({
    swipeCount: 0,
    recentSwipeTimes: [] as number[], // Fixed-size array
    lastCleanup: Date.now()
  });

  const currentProduct = useMemo(() => products[index] || null, [products, index]);
  const { addToWishlist, isLoading: wishlistLoading } = useWishlist();

  // Optimized and memoized image height calculation with caching
  const imageHeightCalculator = useRef<{
    cache: Map<string, number>;
    lastWindowSize: { width: number; height: number };
  }>({
    cache: new Map(),
    lastWindowSize: { width: 0, height: 0 }
  });

  const getImageHeight = useCallback((aspectRatio: number) => {
    const currentWidth = window.innerWidth;
    const currentHeight = window.innerHeight;
    const cacheKey = `${Math.floor(currentWidth / 50)}-${Math.floor(currentHeight / 50)}-${Math.floor(aspectRatio * 100)}`;
    
    // Return cached result if available
    if (imageHeightCalculator.current.cache.has(cacheKey)) {
      return imageHeightCalculator.current.cache.get(cacheKey)!;
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
    
    // Cache the result with size limit
    if (imageHeightCalculator.current.cache.size > 20) {
      const firstKey = imageHeightCalculator.current.cache.keys().next().value;
      imageHeightCalculator.current.cache.delete(firstKey);
    }
    imageHeightCalculator.current.cache.set(cacheKey, calculatedHeight);
    
    return calculatedHeight;
  }, []);

  // Optimized image load handler with error handling
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

  // Optimized navigation with cleanup
  const nextCard = useCallback(() => {
    // Reset motion values more efficiently
    x.set(0);
    y.set(0);
    setIndex(prevIndex => Math.min(prevIndex + 1, products.length - 1));
    
    // Trigger cleanup more frequently
    const now = Date.now();
    if (now - lastCleanupRef.current > CLEANUP_INTERVAL) {
      // Aggressive view tracking cleanup
      if (viewStartTimesRef.current.size > MAX_VIEW_ENTRIES) {
        const entries = Array.from(viewStartTimesRef.current.entries());
        const recentEntries = entries.slice(-MAX_VIEW_ENTRIES);
        viewStartTimesRef.current.clear();
        recentEntries.forEach(([key, value]) => {
          viewStartTimesRef.current.set(key, value);
        });
      }
      
      // Performance metrics cleanup
      if (performanceMetrics.current.recentSwipeTimes.length > MAX_PERFORMANCE_ENTRIES) {
        performanceMetrics.current.recentSwipeTimes = performanceMetrics.current.recentSwipeTimes.slice(-MAX_PERFORMANCE_ENTRIES);
      }
      
      lastCleanupRef.current = now;
    }
  }, [x, y, products.length]);

  // Reset with cleanup when products change
  useEffect(() => {
    setIndex(0);
    x.set(0);
    y.set(0);
    
    // Clear all tracking data when products change
    viewStartTimesRef.current.clear();
    performanceMetrics.current.recentSwipeTimes = [];
    imageHeightCalculator.current.cache.clear();
  }, [products, x, y]);

  // Optimized view tracking with bounds checking
  useLayoutEffect(() => {
    if (currentProduct && viewStartTimesRef.current.size < MAX_VIEW_ENTRIES * 2) {
      const now = Date.now();
      viewStartTimesRef.current.set(currentProduct.id, now);
      
      // Immediate cleanup if over limit
      if (viewStartTimesRef.current.size > MAX_VIEW_ENTRIES) {
        const entries = Array.from(viewStartTimesRef.current.entries());
        const recentEntries = entries.slice(-MAX_VIEW_ENTRIES);
        viewStartTimesRef.current.clear();
        recentEntries.forEach(([key, value]) => {
          viewStartTimesRef.current.set(key, value);
        });
      }
    }
  }, [currentProduct]);

  // Auto-hide instructions with cleanup
  useEffect(() => {
    if (showInstructions) {
      const timer = setTimeout(() => {
        setShowInstructions(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showInstructions]);

  const prevCard = useCallback(() => {
    x.set(0);
    y.set(0);
    setIndex(prevIndex => Math.max(prevIndex - 1, 0));
  }, [x, y]);

  // Optimized like handler with rate limiting
  const handleLike = useCallback(async (product: SwipeProduct) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "You must be signed in to like products.",
        variant: "destructive"
      });
      return;
    }

    // Move to next card IMMEDIATELY
    nextCard();

    // Rate-limited background operations
    const now = performance.now();
    performanceMetrics.current.swipeCount++;
    performanceMetrics.current.recentSwipeTimes.push(now);
    
    // Keep only recent times
    if (performanceMetrics.current.recentSwipeTimes.length > MAX_PERFORMANCE_ENTRIES) {
      performanceMetrics.current.recentSwipeTimes = performanceMetrics.current.recentSwipeTimes.slice(-MAX_PERFORMANCE_ENTRIES);
    }

    // Optimized background operations with timeout and error handling
    queueMicrotask(async () => {
      try {
        const viewDuration = trackViewDuration(product.id, viewStartTimesRef.current.get(product.id) || Date.now());
        
        // Fire-and-forget tracking with timeout
        trackSwipe({
          productId: product.id,
          action: 'right',
          product,
          viewDuration,
          confidence: 1.0
        }).catch(() => {}); // Silent fail

        // Database operation with shorter timeout - Fix: properly handle the Promise
        const dbOperationPromise = supabase.from('likes').insert([{
          user_id: user.id,
          product_id: product.id
        }]).then(result => result);

        // Race with 3 second timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 3000)
        );
        
        const { error } = await Promise.race([dbOperationPromise, timeoutPromise]) as any;

        if (error && error.code !== '23505' && !error.message?.includes('Timeout')) {
          console.error("Like error:", error);
        } else if (!error) {
          toast({
            description: `${product.title} added to your likes!`
          });
        }
      } catch (error) {
        // Silent fail for background operations
      }
    });
  }, [user, toast, nextCard, trackSwipe, trackViewDuration]);

  // Optimized dislike handler
  const handleDislike = useCallback(() => {
    nextCard();

    if (user && currentProduct) {
      queueMicrotask(() => {
        try {
          const viewDuration = trackViewDuration(currentProduct.id, viewStartTimesRef.current.get(currentProduct.id) || Date.now());
          trackSwipe({
            productId: currentProduct.id,
            action: 'left',
            product: currentProduct,
            viewDuration,
            confidence: 1.0
          }).catch(() => {}); // Silent fail
        } catch (error) {
          // Silent fail
        }
      });
    }
  }, [user, currentProduct, nextCard, trackSwipe, trackViewDuration]);

  // Optimized wishlist handler
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
        const viewDuration = trackViewDuration(product.id, viewStartTimesRef.current.get(product.id) || Date.now());
        
        trackSwipe({
          productId: product.id,
          action: 'up',
          product,
          viewDuration,
          confidence: 1.0
        }).catch(() => {});

        await addToWishlist(product.id);
        toast({
          description: `${product.title} added to your wishlist!`
        });
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : "Failed to add to wishlist. Please try again.";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
      }
    });
  }, [user, addToWishlist, toast, nextCard, trackSwipe, trackViewDuration]);

  // Optimized swipe end handler with debouncing
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
      // Optimized spring animation
      animate(x, 0, { type: "spring", stiffness: 150, damping: 20, duration: 0.25 });
      animate(y, 0, { type: "spring", stiffness: 150, damping: 20, duration: 0.25 });
    }
  }, [x, y, index, products, handleLike, handleDislike, handleAddToWishlist]);

  const handleProductClick = (product: SwipeProduct) => {
    setSelectedProduct(product);
    setShowProductDetail(true);
    onProductDetailChange?.(true);
  };

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
        <Button variant="outline" onClick={() => {
          window.location.reload();
        }}>
          Reset Filters
        </Button>
      </div>
    );
  }

  // Handle full-page product detail view
  if (showProductDetail && selectedProduct) {
    const transformedProduct = {
      ...selectedProduct,
      media_urls: selectedProduct.media_urls,
      brand: selectedProduct.brands?.name 
        ? { name: selectedProduct.brands.name }
        : selectedProduct.brands || { name: selectedProduct.merchant_name || 'ASOS' },
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
          <motion.div
            key={currentProduct.id}
            ref={cardRef}
            className="absolute -top-8 sm:top-0 left-0 w-full h-full"
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
            <Card className="h-full flex flex-col cursor-grab active:cursor-grabbing overflow-hidden min-h-[650px] max-w-md mx-auto rounded-3xl shadow-xl shadow-black/10" style={{ willChange: 'transform', contain: 'layout style paint', transform: 'translate3d(0,0,0)' }}>
              <CardContent className="p-3 pb-2 sm:p-4 lg:pb-5 flex flex-col h-full bg-background/60 backdrop-blur-sm min-h-[600px]">
                 <div 
                   className="relative w-full overflow-hidden rounded-2xl flex-shrink-0"
                   style={{
                      height: `${getImageHeight(imageAspectRatio) - (window.innerWidth <= 768 ? 15 : 0)}px`,
                      maxHeight: `${getImageHeight(imageAspectRatio) - (window.innerWidth <= 768 ? 15 : 0)}px`,
                     overflow: 'hidden'
                   }}
                   onClick={() => setShowInstructions(true)}
                 >
                    <img
                      {...getResponsiveImageProps(
                        getPrimaryImageUrl(currentProduct),
                        "(max-width: 768px) 100vw, 50vw"
                      )}
                      alt={currentProduct.title}
                      className="object-contain w-full h-full transition-opacity duration-300 max-h-full"
                      onLoad={handleImageLoad}
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        img.src = '/placeholder.svg';
                      }}
                      style={{ maxHeight: '100%', maxWidth: '100%' }}
                    />
                    
                     {/* Multiple images indicator and swipe instructions */}
                     <div className="absolute top-4 left-4 flex items-center gap-3">
                       {hasMultipleImages(currentProduct) && (
                         <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
                           <Image className="h-3 w-3" />
                           {getImageCount(currentProduct)}
                         </div>
                       )}
                       
                       {/* Swipe Instructions */}
                       <AnimatePresence>
                         {showInstructions && (
                           <motion.div
                             initial={{ opacity: 0, y: -10 }}
                             animate={{ opacity: 1, y: 0 }}
                             exit={{ opacity: 0, y: -10 }}
                             transition={{ duration: 0.3 }}
                             className="bg-black/75 text-white text-xs px-2 py-1 rounded-full"
                           >
                             ← Pass • ↑ Save • Like →
                           </motion.div>
                         )}
                       </AnimatePresence>
                     </div>
                 </div>
                 
                  <div className="flex flex-col flex-grow space-y-1 mt-1 mx-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base font-semibold line-clamp-1">{currentProduct.title}</h3>
                         <p className="text-xs text-muted-foreground line-clamp-1">{currentProduct.brand?.name || currentProduct.merchant_name}</p>
                      </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProductClick(currentProduct);
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
                      
                      {/* Action Buttons */}
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
                            handleAddToWishlist(currentProduct);
                          }}
                          disabled={wishlistLoading}
                          className="h-8 w-8 rounded-full bg-accent/10 hover:bg-accent/20"
                        >
                          <ShoppingBag className="h-3 w-3 text-accent-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLike(currentProduct);
                          }}
                          className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20"
                        >
                          <Heart className="h-3 w-3 text-primary" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Shop Now Button for External Products */}
                  {currentProduct.external_url && (
                    <div className="pt-2 border-t border-border">
                      <Button
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          
                          if (currentProduct.external_url) {
                            try {
                              const url = currentProduct.external_url.startsWith('http') 
                                ? currentProduct.external_url 
                                : `https://${currentProduct.external_url}`;
                              
                              if (user) {
                                // Fix: Properly handle the Promise from supabase insert
                                try {
                                  await supabase.from('events').insert([{
                                    event_type: 'shop_now_click',
                                    user_id: user.id,
                                    product_id: currentProduct.id,
                                    event_data: { source: 'swipe_deck', external_url: url }
                                  }]);
                                } catch (error) {
                                  // Silent fail for analytics
                                }
                              }
                              
                              const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
                              
                              if (!newWindow) {
                                window.location.href = url;
                              } else {
                                toast({ description: 'Opening product page...' });
                              }
                            } catch (error) {
                              toast({ 
                                description: 'Failed to open product page', 
                                variant: 'destructive' 
                              });
                            }
                          }
                        }}
                        className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-semibold shadow-lg pointer-events-auto"
                        size="sm"
                      >
                        Shop Now
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No More Products State */}
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
              <Heart className="h-4 w-4" />
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
