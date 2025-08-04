import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useProducts, useSwipeProduct } from '@/hooks/useProducts';
import { useAuth } from '@/contexts/AuthContext';
import { Product } from '@/types';
import SwipeAnalytics from '@/utils/swipeAnalytics';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  X, 
  Bookmark, 
  Camera, 
  Sparkles,
  Info
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ProductDetailModal } from '@/components/ProductDetailModal';
import { useProductAnalytics } from '@/hooks/useAnalytics';

interface SwipeDeckProps {
  filter?: string;
  subcategory?: string;
  priceRange?: {
    min: number;
    max: number;
  };
  searchQuery?: string;
}

const SwipeDeck = ({ 
  filter = 'all', 
  subcategory = '', 
  priceRange = { min: 0, max: 1000 }, 
  searchQuery = '' 
}: SwipeDeckProps) => {
  const { user } = useAuth();
  const { data: allProducts, isLoading } = useProducts({ limit: 50 });
  const swipeProduct = useSwipeProduct();
  const { trackProductView, trackProductClick } = useProductAnalytics();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Filter and personalize products
  const products = useMemo(() => {
    if (!allProducts) return null;
    
    let filtered = allProducts;
    
    // Apply filters (simplified for now)
    if (filter && filter !== 'all') {
      // Basic filter implementation - adjust based on actual Product type
      filtered = filtered.filter(product => 
        product.title.toLowerCase().includes(filter.toLowerCase())
      );
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.title.toLowerCase().includes(query) ||
        product.brand?.name.toLowerCase().includes(query)
      );
    }
    
    if (priceRange) {
      filtered = filtered.filter(product => {
        const price = product.price_cents / 100;
        return price >= priceRange.min && price <= priceRange.max;
      });
    }
    
    // Apply personalization
    return SwipeAnalytics.getPersonalizedRecommendations(user?.id || '', filtered);
  }, [allProducts, filter, subcategory, searchQuery, priceRange, user?.id]);

  const currentProduct = products?.[currentIndex];

  // Stable motion values - created once and reused
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  // Memoized transforms to prevent recreation
  const rotate = useMemo(() => useTransform(x, [-150, 150], [-15, 15]), [x]);
  const opacity = useMemo(() => useTransform(x, [-150, 0, 150], [0.8, 1, 0.8]), [x]);
  
  // Action indicators
  const loveOpacity = useMemo(() => useTransform(x, [50, 100], [0, 1]), [x]);
  const passOpacity = useMemo(() => useTransform(x, [-100, -50], [1, 0]), [x]);
  const wishlistOpacity = useMemo(() => useTransform(y, [-100, -50], [1, 0]), [y]);

  // Track product views
  useEffect(() => {
    if (currentProduct) {
      trackProductView(currentProduct.id, 'swipe_deck');
    }
  }, [currentProduct?.id, trackProductView]);

  const handleDragEnd = useCallback((event: any, info: PanInfo) => {
    if (isAnimating) return;
    
    const threshold = 80;
    const { offset, velocity } = info;

    if (Math.abs(offset.x) > threshold || Math.abs(velocity.x) > 400) {
      handleSwipe(offset.x > 0 ? 'right' : 'left');
    } else if (offset.y < -threshold || velocity.y < -400) {
      handleSwipe('up');
    } else {
      // Snap back
      x.set(0);
      y.set(0);
    }
  }, [isAnimating, x, y]);

  const handleSwipe = useCallback(async (direction: 'left' | 'right' | 'up') => {
    if (!currentProduct || !user || isAnimating) return;

    setIsAnimating(true);

    const messages = {
      left: "Skipped! 👋",
      right: "Loved it! ❤️",
      up: "Added to wishlist! ⭐"
    };

    // Immediate feedback
    toast({
      title: messages[direction],
      description: currentProduct.title,
      duration: 1500
    });

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    try {
      // Background processing
      SwipeAnalytics.trackSwipe(user.id, currentProduct.id, direction);
      swipeProduct.mutate({
        productId: currentProduct.id,
        action: direction,
        userId: user.id
      });

      // Animate out and transition
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setIsAnimating(false);
        x.set(0);
        y.set(0);
      }, 300);

    } catch (error) {
      console.error('Swipe error:', error);
      setIsAnimating(false);
      x.set(0);
      y.set(0);
    }
  }, [currentProduct, user, isAnimating, swipeProduct, x, y]);

  const handleProductDetail = useCallback(() => {
    if (currentProduct) {
      trackProductClick(currentProduct.id, 'swipe_deck_detail');
      setSelectedProduct(currentProduct);
      setIsDetailModalOpen(true);
    }
  }, [currentProduct, trackProductClick]);

  const formatPrice = useCallback((cents: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(cents / 100);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="animate-spin">
            <Sparkles className="h-8 w-8 text-primary mx-auto" />
          </div>
          <p className="text-muted-foreground">Curating your fashion feed...</p>
        </div>
      </div>
    );
  }

  if (!currentProduct || currentIndex >= (products?.length || 0)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-6 max-w-md">
          <div className="bg-gradient-to-r from-primary to-accent p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
            <Sparkles className="h-10 w-10 text-white" />
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-bold">You're all caught up!</h2>
            <p className="text-muted-foreground">
              No more items to discover right now. Check back later for fresh fashion finds!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Current Card */}
      <motion.div
        drag={!isAnimating}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x, y, rotate, opacity }}
        animate={isAnimating ? { 
          x: x.get() > 0 ? 300 : x.get() < 0 ? -300 : 0,
          y: y.get() < 0 ? -300 : 0,
          opacity: 0 
        } : {}}
        transition={{ type: 'tween', duration: 0.3 }}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
      >
        <Card className="w-full h-full shadow-2xl border-0 overflow-hidden bg-background">
          <div className="relative h-3/5">
            <img
              src={currentProduct.media_urls[0] || '/placeholder.svg'}
              alt={currentProduct.title}
              className="w-full h-full object-cover"
            />
            
            {/* Action Indicators */}
            <motion.div
              style={{ opacity: loveOpacity }}
              className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full font-medium shadow-lg"
            >
              <Heart className="inline w-4 h-4 mr-1" />
              LOVE
            </motion.div>
            
            <motion.div
              style={{ opacity: passOpacity }}
              className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full font-medium shadow-lg"
            >
              <X className="inline w-4 h-4 mr-1" />
              PASS
            </motion.div>
            
            <motion.div
              style={{ opacity: wishlistOpacity }}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-white px-4 py-2 rounded-full font-medium shadow-lg"
            >
              <Bookmark className="inline w-4 h-4 mr-1" />
              WISHLIST
            </motion.div>
            
            {/* Product Detail Button */}
            <Button
              size="sm"
              variant="secondary"
              className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-sm hover:bg-background/95"
              onClick={handleProductDetail}
            >
              <Info className="h-4 w-4 mr-1" />
              Details
            </Button>

            {/* AR Badge */}
            {currentProduct.ar_mesh_url && (
              <Badge className="absolute bottom-4 left-4 bg-purple-500 hover:bg-purple-600">
                <Camera className="h-3 w-3 mr-1" />
                AR Try-On
              </Badge>
            )}
          </div>

          <CardContent className="p-6 h-2/5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg line-clamp-2">
                    {currentProduct.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {currentProduct.brand?.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-primary">
                    {formatPrice(currentProduct.price_cents, currentProduct.currency)}
                  </p>
                  {currentProduct.compare_at_price_cents && (
                    <p className="text-sm text-muted-foreground line-through">
                      {formatPrice(currentProduct.compare_at_price_cents, currentProduct.currency)}
                    </p>
                  )}
                </div>
              </div>

              {currentProduct.attributes?.style_tags && (
                <div className="flex flex-wrap gap-1">
                  {currentProduct.attributes.style_tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Next Card Preview */}
      {products?.[currentIndex + 1] && (
        <div className="absolute inset-0 -z-10 scale-95 opacity-50">
          <Card className="w-full h-full shadow-xl border-0 overflow-hidden bg-background">
            <div className="h-3/5">
              <img
                src={products[currentIndex + 1].media_urls[0] || '/placeholder.svg'}
                alt={products[currentIndex + 1].title}
                className="w-full h-full object-cover"
              />
            </div>
          </Card>
        </div>
      )}

      {/* Action Buttons */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
        <Button
          size="lg"
          variant="outline"
          className="rounded-full w-12 h-12 border-red-200 hover:bg-red-50"
          onClick={() => handleSwipe('left')}
          disabled={isAnimating}
        >
          <X className="h-5 w-5 text-red-500" />
        </Button>
        
        <Button
          size="lg"
          variant="outline"
          className="rounded-full w-12 h-12 border-primary/20 hover:bg-primary/10"
          onClick={() => handleSwipe('up')}
          disabled={isAnimating}
        >
          <Bookmark className="h-5 w-5 text-primary" />
        </Button>
        
        <Button
          size="lg"
          variant="outline"
          className="rounded-full w-12 h-12 border-green-200 hover:bg-green-50"
          onClick={() => handleSwipe('right')}
          disabled={isAnimating}
        >
          <Heart className="h-5 w-5 text-green-500" />
        </Button>
      </div>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedProduct(null);
        }}
        onAddToWishlist={(productId) => {
          toast({
            title: "Added to wishlist",
            description: "Product has been added to your wishlist.",
          });
        }}
        onAddToBag={(productId, size) => {
          toast({
            title: "Redirecting to shop",
            description: `Opening ${selectedProduct?.brand?.name}'s product page.`,
          });
        }}
      />
    </div>
  );
};

export default SwipeDeck;