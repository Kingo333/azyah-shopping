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

  // Simplified motion values
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-150, 150], [-15, 15]);
  const opacity = useTransform(x, [-150, 0, 150], [0.8, 1, 0.8]);

  // Simplified action indicator transforms
  const loveOpacity = useTransform(x, [50, 100], [0, 1]);
  const passOpacity = useTransform(x, [-100, -50], [1, 0]);
  const wishlistOpacity = useTransform(y, [-100, -50], [1, 0]);

  // Track product views
  useEffect(() => {
    if (currentProduct) {
      trackProductView(currentProduct.id, 'swipe_deck');
    }
  }, [currentProduct, trackProductView]);

  const handleDragEnd = (event: any, info: PanInfo) => {
    if (isAnimating) return;
    
    const threshold = 80;
    const { offset, velocity } = info;

    if (Math.abs(offset.x) > threshold || Math.abs(velocity.x) > 400) {
      handleSwipe(offset.x > 0 ? 'right' : 'left');
    } else if (offset.y < -threshold || velocity.y < -400) {
      handleSwipe('up');
    } else {
      // Snap back smoothly
      x.set(0);
      y.set(0);
    }
  };

  const handleSwipe = async (direction: 'left' | 'right' | 'up') => {
    if (!currentProduct || !user || isAnimating) return;

    setIsAnimating(true);
    setSwipeDirection(direction);

    const messages = {
      left: "Skipped! 👋",
      right: "Loved it! ❤️",
      up: "Added to wishlist! ⭐"
    };

    // Immediate visual feedback
    toast({
      title: messages[direction],
      description: `${currentProduct.title}`,
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

      // Transition to next card after animation
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setSwipeDirection(null);
        setIsAnimating(false);
        x.set(0);
        y.set(0);
      }, 300);

    } catch (error) {
      console.error('Swipe error:', error);
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
            key={currentProduct.id}
            drag={!isAnimating}
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
            style={{ x, y, rotate, opacity }}
            animate={
              swipeDirection === 'left' 
                ? { x: -300, opacity: 0, rotate: -20 }
                : swipeDirection === 'right'
                ? { x: 300, opacity: 0, rotate: 20 }
                : swipeDirection === 'up'
                ? { y: -300, opacity: 0 }
                : { x: 0, y: 0, rotate: 0, opacity: 1 }
            }
            transition={{ 
              type: 'tween', 
              duration: 0.3,
              ease: "easeOut"
            }}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
          >
            <Card className="w-full h-full shadow-2xl border-0 overflow-hidden bg-white">
              <div className="relative h-3/5">
                <img
                  src={currentProduct.media_urls[0] || '/placeholder.svg'}
                  alt={currentProduct.title}
                  className="w-full h-full object-cover"
                />
                
                 {/* Simplified Action Indicators */}
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