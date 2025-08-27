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

const SwipeDeck: React.FC<SwipeDeckProps> = ({
  filter,
  subcategory,
  gender,
  priceRange,
  searchQuery,
  currency = 'USD'
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

  // Track view start times for implicit feedback - using useRef to avoid re-renders
  const viewStartTimesRef = useRef<Map<string, number>>(new Map());

  const currentProduct = useMemo(() => products[index] || null, [products, index]);
  const { addToWishlist, isLoading: wishlistLoading } = useWishlist(currentProduct?.id);

  // Calculate image height based on aspect ratio with better mobile optimization
  const getImageHeight = useCallback((aspectRatio: number) => {
    const isMobile = window.innerWidth < 640;
    
    if (isMobile) {
      // For mobile, maximize image space
      const availableHeight = window.innerHeight * 0.85; // Use more of the screen
      const detailsMinHeight = 100; // Reduced minimum space needed for details
      const maxImageHeight = availableHeight - detailsMinHeight;
      const minHeight = 320; // Increased minimum for better visibility
      const calculatedHeight = 400 / aspectRatio;
      
      return Math.max(minHeight, Math.min(maxImageHeight, calculatedHeight));
    } else {
      // Desktop: maximize image space while keeping details visible
      const maxHeight = window.innerHeight * 0.65; // Increased from 0.55
      const minHeight = 250;
      const calculatedHeight = 500 / aspectRatio;
      
      // For very long images (tall aspect ratio), still allow more height
      if (aspectRatio < 0.6) {
        return Math.max(minHeight, Math.min(window.innerHeight * 0.45, calculatedHeight));
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
    viewStartTimesRef.current.clear();
  }, [products, x, y]);

  // Track view start time for current product - using useLayoutEffect for sync timing
  useLayoutEffect(() => {
    if (currentProduct) {
      viewStartTimesRef.current.set(currentProduct.id, Date.now());
      
      // Cleanup old entries to prevent memory leaks
      if (viewStartTimesRef.current.size > 100) {
        const entries = Array.from(viewStartTimesRef.current.entries());
        const keepEntries = entries.slice(-50); // Keep only last 50 entries
        viewStartTimesRef.current = new Map(keepEntries);
      }
    }
  }, [index, currentProduct]);

  // Auto-hide instructions after 3 seconds
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

  const handleLike = useCallback(async (product: SwipeProduct) => {
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

    // Fire-and-forget background operations
    queueMicrotask(async () => {
      try {
        // Track view duration for implicit feedback
        const viewDuration = trackViewDuration(product.id, viewStartTimesRef.current.get(product.id) || Date.now());
        
        // Track enhanced swipe with metadata (no await)
        trackSwipe({
          productId: product.id,
          action: 'right',
          product,
          viewDuration,
          confidence: 1.0
        }).catch(error => console.error('Error tracking like:', error));

        // Database operation
        const { error } = await supabase.from('likes').insert([{
          user_id: user.id,
          product_id: product.id
        }]);

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
      } catch (error) {
        console.error('Background like operation failed:', error);
      }
    });
  }, [user, toast, nextCard, trackSwipe, trackViewDuration]);

  const handleDislike = useCallback(async () => {
    // Move to next card IMMEDIATELY for instant animation
    nextCard();

    // Fire-and-forget background tracking
    if (user && currentProduct) {
      queueMicrotask(() => {
        const viewDuration = trackViewDuration(currentProduct.id, viewStartTimesRef.current.get(currentProduct.id) || Date.now());
        
        trackSwipe({
          productId: currentProduct.id,
          action: 'left',
          product: currentProduct,
          viewDuration,
          confidence: 1.0
        }).catch(error => console.error('Error tracking dislike:', error));
      });
    }
  }, [user, currentProduct, nextCard, trackSwipe, trackViewDuration]);

  const handleAddToWishlist = useCallback(async (product: SwipeProduct) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "You must be signed in to add to wishlist.",
        variant: "destructive"
      });
      return;
    }

    // Move to next card immediately for smooth animation
    nextCard();

    // Fire-and-forget background operations
    queueMicrotask(async () => {
      try {
        // Track view duration for implicit feedback
        const viewDuration = trackViewDuration(product.id, viewStartTimesRef.current.get(product.id) || Date.now());
        
        // Track enhanced swipe with metadata (no await)
        trackSwipe({
          productId: product.id,
          action: 'up',
          product,
          viewDuration,
          confidence: 1.0
        }).catch(error => console.error('Error tracking wishlist:', error));

        // Handle wishlist operation
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
    });
  }, [user, addToWishlist, toast, nextCard, trackSwipe, trackViewDuration]);

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
      // Reset position with optimized spring physics
      animate(x, 0, { type: "spring", stiffness: 200, damping: 25, duration: 0.3 });
      animate(y, 0, { type: "spring", stiffness: 200, damping: 25, duration: 0.3 });
    }
  }, [x, y, index, products, handleLike, handleDislike, handleAddToWishlist]);


  const handleProductClick = (product: SwipeProduct) => {
    setSelectedProduct(product);
    setShowProductDetail(true);
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
    // DEBUG: Log SwipeDeck transformation
    console.log('=== SwipeDeck Transformation Debug ===');
    console.log('Selected product for detail view:', selectedProduct);
    console.log('Original media_urls:', selectedProduct.media_urls);
    console.log('Original media_urls type:', typeof selectedProduct.media_urls);
    
    // Transform SwipeProduct to Product for ProductDetailPage
    const transformedProduct = {
      ...selectedProduct,
      // Keep original media_urls format for ProductDetailPage compatibility
      media_urls: selectedProduct.media_urls,
      brand: selectedProduct.brands || { name: selectedProduct.merchant_name || 'Unknown' },
      price_cents: selectedProduct.price_cents,
      currency: selectedProduct.currency || 'USD'
    };
    
    console.log('Transformed product:', transformedProduct);
    console.log('Transformed media_urls:', transformedProduct.media_urls);
    console.log('=== End SwipeDeck Transformation Debug ===');

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
            <Card className="h-full flex flex-col cursor-grab active:cursor-grabbing overflow-hidden" style={{ willChange: 'transform', contain: 'layout style paint' }}>
              <CardContent className="p-2 sm:p-3 lg:pb-4 flex flex-col h-full bg-background/60 backdrop-blur-sm">
                 <div 
                   className="relative w-full mb-1 sm:mb-2 overflow-hidden rounded-lg flex-shrink-0"
                   style={{
                     height: `${getImageHeight(imageAspectRatio)}px`
                   }}
                   onClick={() => setShowInstructions(true)}
                 >
                    <img
                      {...getResponsiveImageProps(
                        getPrimaryImageUrl(currentProduct),
                        "(max-width: 768px) 100vw, 50vw"
                      )}
                      alt={currentProduct.title}
                      className="object-cover w-full h-full transition-opacity duration-300"
                      onLoad={handleImageLoad}
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        const originalSrc = img.src;
                        console.warn('Image failed to load for product:', currentProduct.id, 'URL:', originalSrc);
                        img.src = '/placeholder.svg';
                      }}
                    />
                    
                    {/* Multiple images indicator for ASOS products */}
                    {hasMultipleImages(currentProduct) && (
                      <div className="absolute top-4 left-4 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
                        <Image className="h-3 w-3" />
                        {getImageCount(currentProduct)}
                      </div>
                    )}
                </div>
                
                 <div className="flex flex-col flex-grow space-y-1">
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
                      
                      {/* Action Buttons - smaller and positioned to the right */}
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
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Shop Now clicked - URL:', currentProduct.external_url);
                          
                          if (currentProduct.external_url) {
                            try {
                              // Validate URL
                              const url = currentProduct.external_url.startsWith('http') 
                                ? currentProduct.external_url 
                                : `https://${currentProduct.external_url}`;
                              
                              console.log('Opening URL:', url);
                              
                              // Track shop now click
                              if (user) {
                                supabase.from('events').insert([{
                                  event_type: 'shop_now_click',
                                  user_id: user.id,
                                  product_id: currentProduct.id,
                                  event_data: { source: 'swipe_deck', external_url: url }
                                }]);
                              }
                              
                              const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
                              
                              if (!newWindow) {
                                // Fallback for popup blockers
                                console.log('Popup blocked, using location.href');
                                window.location.href = url;
                              } else {
                                toast({ description: 'Opening product page...' });
                              }
                            } catch (error) {
                              console.error('Failed to open URL:', error);
                              toast({ 
                                description: 'Failed to open product page', 
                                variant: 'destructive' 
                              });
                            }
                          } else {
                            console.log('No external URL available');
                            toast({ 
                              description: 'Shop link not available for this product', 
                              variant: 'destructive' 
                            });
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




      {/* Swipe instructions - auto-hide after 3 seconds, show on image tap */}
      {showInstructions && (
        <div className="absolute top-4 left-4 right-4 text-center">
          <div className="bg-black/20 backdrop-blur-sm rounded-lg p-2 text-white text-xs">
            ← Pass • ↑ Save • Like →
          </div>
        </div>
      )}

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
