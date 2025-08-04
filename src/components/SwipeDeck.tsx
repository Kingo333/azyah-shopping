import { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, PanInfo, useSpring } from 'framer-motion';
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
  ArrowLeft,
  MoreHorizontal,
  Info
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ProductDetailModal } from '@/components/ProductDetailModal';
import { useProductAnalytics } from '@/hooks/useAnalytics';

interface SwipeDeckProps {
  onBack?: () => void;
}

const SwipeDeck = ({ onBack }: SwipeDeckProps) => {
  const { user } = useAuth();
  const { data: allProducts, isLoading } = useProducts({ limit: 50 });
  
  // Apply personalization algorithm
  const products = allProducts ? SwipeAnalytics.getPersonalizedRecommendations(user?.id || '', allProducts) : null;
  const swipeProduct = useSwipeProduct();
  const { trackProductView, trackProductClick } = useProductAnalytics();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | 'up' | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const currentProduct = products?.[currentIndex];
  const remainingCount = products ? products.length - currentIndex : 0;

  // Enhanced motion values with spring physics
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 30 });
  const springY = useSpring(y, { stiffness: 300, damping: 30 });
  const rotate = useTransform(x, [-200, 200], [-30, 30]);
  const opacity = useTransform(x, [-200, -50, 0, 50, 200], [0, 1, 1, 1, 0]);
  const scale = useTransform(x, [-200, 0, 200], [0.9, 1, 0.9]);

  // Action indicator transforms - moved to top level
  const loveOpacity = useTransform(x, [50, 150], [0, 1]);
  const loveScale = useTransform(x, [50, 150], [0.8, 1.1]);
  const passOpacity = useTransform(x, [-150, -50], [1, 0]);
  const passScale = useTransform(x, [-150, -50], [1.1, 0.8]);
  const wishlistOpacity = useTransform(y, [-150, -50], [1, 0]);
  const wishlistScale = useTransform(y, [-150, -50], [1.1, 0.8]);

  // Track product views
  useEffect(() => {
    if (currentProduct) {
      trackProductView(currentProduct.id, 'swipe_deck');
    }
  }, [currentProduct, trackProductView]);

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 100;
    const { offset, velocity } = info;

    if (Math.abs(offset.x) > threshold || Math.abs(velocity.x) > 500) {
      if (offset.x > 0) {
        handleSwipe('right');
      } else {
        handleSwipe('left');
      }
    } else if (offset.y < -threshold || velocity.y < -500) {
      handleSwipe('up');
    } else {
      // Snap back
      x.set(0);
      y.set(0);
    }
  };

  const handleSwipe = async (direction: 'left' | 'right' | 'up') => {
    if (!currentProduct || !user || isAnimating) return;

    setIsAnimating(true);
    setSwipeDirection(direction);

    try {
      // Track analytics first
      await SwipeAnalytics.trackSwipe(user.id, currentProduct.id, direction);
      
      await swipeProduct.mutateAsync({
        productId: currentProduct.id,
        action: direction,
        userId: user.id
      });

      // Enhanced feedback with haptic simulation
      const messages = {
        left: "Skipped! 👋",
        right: "Loved it! ❤️ (24hr temp save)",
        up: "Added to wishlist! ⭐"
      };

      // Haptic feedback simulation
      if (navigator.vibrate) {
        navigator.vibrate(direction === 'right' ? [50, 30, 50] : [50]);
      }

      toast({
        title: messages[direction],
        description: `${currentProduct.title} by ${currentProduct.brand?.name}`,
        duration: 2000
      });

      // Smooth transition to next card
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setSwipeDirection(null);
        setIsAnimating(false);
        x.set(0);
        y.set(0);
      }, 400);

    } catch (error) {
      setSwipeDirection(null);
      setIsAnimating(false);
      x.set(0);
      y.set(0);
    }
  };

  const handleProductDetail = () => {
    if (currentProduct) {
      trackProductClick(currentProduct.id, 'swipe_deck_detail');
      setSelectedProduct(currentProduct);
      setIsDetailModalOpen(true);
    }
  };

  const formatPrice = (cents: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(cents / 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
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
          <Button 
            onClick={onBack}
            className="bg-gradient-to-r from-primary to-accent hover:shadow-lg"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center gap-2">
            {/* Enhanced progress dots with animation */}
            <div className="flex space-x-1">
              {Array.from({ length: Math.min(remainingCount, 8) }).map((_, i) => (
                <motion.div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i === 0 
                      ? 'bg-primary scale-125' 
                      : i < 3 
                      ? 'bg-primary/60' 
                      : 'bg-muted'
                  }`}
                  animate={{
                    scale: i === 0 ? [1, 1.2, 1] : 1,
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              ))}
              {remainingCount > 8 && (
                <Badge variant="outline" className="ml-1 text-xs">
                  +{remainingCount - 8}
                </Badge>
              )}
            </div>
            <Badge variant="secondary" className="ml-2">
              {remainingCount} left
            </Badge>
          </div>

          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Swipe Area */}
      <div className="flex-1 flex items-center justify-center p-4 relative">
        <div className="relative w-full max-w-sm h-[600px]">
          {/* Current Card */}
          <motion.div
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            style={{
              x: springX,
              y: springY,
              rotate,
              opacity,
              scale
            }}
            animate={
              swipeDirection === 'left' 
                ? { x: -400, opacity: 0, rotate: -45, scale: 0.8 }
                : swipeDirection === 'right'
                ? { x: 400, opacity: 0, rotate: 45, scale: 0.8 }
                : swipeDirection === 'up'
                ? { y: -400, opacity: 0, scale: 0.8 }
                : {}
            }
            transition={{ 
              type: 'spring', 
              stiffness: 400, 
              damping: 25,
              duration: 0.4
            }}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card className="w-full h-full shadow-2xl border-0 overflow-hidden bg-white">
              <div className="relative h-3/5">
                <img
                  src={currentProduct.media_urls[0] || '/placeholder.svg'}
                  alt={currentProduct.title}
                  className="w-full h-full object-cover"
                />
                
                 {/* Enhanced Action Indicators */}
                <motion.div
                  style={{ 
                    opacity: loveOpacity,
                    scale: loveScale
                  }}
                  className="absolute top-4 right-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-full font-bold shadow-lg backdrop-blur-sm"
                >
                  <Heart className="inline w-4 h-4 mr-1" />
                  LOVE IT!
                </motion.div>
                
                <motion.div
                  style={{ 
                    opacity: passOpacity,
                    scale: passScale
                  }}
                  className="absolute top-4 left-4 bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-full font-bold shadow-lg backdrop-blur-sm"
                >
                  <X className="inline w-4 h-4 mr-1" />
                  PASS
                </motion.div>
                
                <motion.div
                  style={{ 
                    opacity: wishlistOpacity,
                    scale: wishlistScale
                  }}
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-primary to-purple-600 text-white px-6 py-3 rounded-full font-bold shadow-lg backdrop-blur-sm"
                >
                  <Bookmark className="inline w-5 h-5 mr-2" />
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

                  {currentProduct.attributes.style_tags && (
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
              <Card className="w-full h-full shadow-xl border-0 overflow-hidden bg-white">
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
        </div>
      </div>

      {/* Action Buttons */}
      <div className="sticky bottom-0 bg-white/80 backdrop-blur-sm border-t p-4">
        <div className="flex justify-center space-x-6">
          <Button
            size="lg"
            variant="outline"
            className="rounded-full w-14 h-14 border-red-200 hover:bg-red-50 hover:border-red-300"
            onClick={() => handleSwipe('left')}
          >
            <X className="h-6 w-6 text-red-500" />
          </Button>
          
          <Button
            size="lg"
            variant="outline"
            className="rounded-full w-14 h-14 border-primary/20 hover:bg-primary/10"
            onClick={() => handleSwipe('up')}
          >
            <Bookmark className="h-6 w-6 text-primary" />
          </Button>
          
          <Button
            size="lg"
            variant="outline"
            className="rounded-full w-14 h-14 border-green-200 hover:bg-green-50 hover:border-green-300"
            onClick={() => handleSwipe('right')}
          >
            <Heart className="h-6 w-6 text-green-500" />
          </Button>
        </div>
        
        <div className="text-center mt-3 text-sm text-muted-foreground">
          Swipe left to pass • Up for wishlist • Right to love
        </div>
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
          // Handle wishlist addition
          toast({
            title: "Added to wishlist",
            description: "Product has been added to your wishlist.",
          });
        }}
        onAddToBag={(productId, size) => {
          // Handle see shop - open external URL
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