
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
import { supabase } from '@/integrations/supabase/client';
import { ProductDetailModal } from '@/components/ProductDetailModal';
import { useProductAnalytics } from '@/hooks/useAnalytics';
import MiniCard from '@/components/MiniCard';

interface SwipeDeckProps {
  filter?: string;
  subcategory?: string;
  priceRange?: { min: number; max: number };
  searchQuery?: string;
}

interface SeenProduct extends Product {
  swipeAction: 'left' | 'right' | 'up';
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
  const [seenProducts, setSeenProducts] = useState<SeenProduct[]>([]);
  const [activeTab, setActiveTab] = useState<'swipe' | 'seen'>('swipe');
  
  // Performance optimization: Preload next image
  const [nextImagePreloaded, setNextImagePreloaded] = useState(false);

  const products = useMemo(() => {
    if (!allProducts) return null;
    let filtered = allProducts;
    if (filter && filter !== 'all') {
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
    return SwipeAnalytics.getPersonalizedRecommendations(user?.id || '', filtered);
  }, [allProducts, filter, subcategory, searchQuery, priceRange, user?.id]);

  const currentProduct = products?.[currentIndex];
  const isAllCaughtUp = !currentProduct || currentIndex >= (products?.length || 0);

  // Performance optimization: Single spring configuration for consistent physics
  const springConfig = { stiffness: 220, damping: 26, mass: 1 };

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const rotate = useTransform(x, [-150, 150], [-15, 15]);
  const opacity = useTransform(x, [-150, 0, 150], [0.8, 1, 0.8]);
  const loveOpacity = useTransform(x, [50, 100], [0, 1]);
  const passOpacity = useTransform(x, [-100, -50], [1, 0]);
  const wishlistOpacity = useTransform(y, [-100, -50], [1, 0]);

  useEffect(() => {
    if (currentProduct) {
      trackProductView(currentProduct.id, 'swipe_deck');
    }
  }, [currentProduct?.id, trackProductView]);

  // Preload next image for performance
  useEffect(() => {
    if (products && products[currentIndex + 1] && !nextImagePreloaded) {
      const img = new Image();
      img.onload = () => setNextImagePreloaded(true);
      img.src = products[currentIndex + 1].media_urls[0] || '/placeholder.svg';
    }
  }, [products, currentIndex, nextImagePreloaded]);

  const handleTouchStart = useCallback((event: TouchEvent | React.TouchEvent) => {
    if (isAnimating) return;
    const touch = event.touches[0];
    setStartPosition({ x: touch.clientX, y: touch.clientY });
    setIsDragging(true);
  }, [isAnimating]);

  const handleTouchMove = useCallback((event: TouchEvent | React.TouchEvent) => {
    if (!isDragging || isAnimating) return;
    event.preventDefault();
    const touch = event.touches[0];
    x.set(touch.clientX - startPosition.x);
    y.set(touch.clientY - startPosition.y);
  }, [isDragging, isAnimating, startPosition, x, y]);

  const handleTouchEnd = useCallback((event: TouchEvent | React.TouchEvent) => {
    if (!isDragging || isAnimating) return;
    setIsDragging(false);
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - startPosition.x;
    const deltaY = touch.clientY - startPosition.y;
    const threshold = 80;
    if (Math.abs(deltaX) > threshold) handleSwipe(deltaX > 0 ? 'right' : 'left');
    else if (deltaY < -threshold) handleSwipe('up');
    else { x.set(0); y.set(0); }
  }, [isDragging, isAnimating, startPosition, x, y]);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (isAnimating) return;
    const threshold = 80;
    if (Math.abs(info.offset.x) > threshold || Math.abs(info.velocity.x) > 400) {
      handleSwipe(info.offset.x > 0 ? 'right' : 'left');
    } else if (info.offset.y < -threshold || info.velocity.y < -400) {
      handleSwipe('up');
    } else { x.set(0); y.set(0); }
  }, [isAnimating, x, y]);

  const handleSwipe = useCallback(async (direction: 'left' | 'right' | 'up') => {
    if (!currentProduct || !user || isAnimating) return;
    setIsAnimating(true);
    
    // Add to seen products immediately for UI responsiveness
    setSeenProducts(prev => [{
      ...currentProduct,
      swipeAction: direction
    }, ...prev].slice(0, 25));

    const messages = { left: "Skipped! 👋", right: "Loved it! ❤️", up: "Added to wishlist! ⭐" };
    toast({ title: messages[direction], description: currentProduct.title, duration: 1500 });
    if (navigator.vibrate) navigator.vibrate(50);

    // Performance optimization: Detach async operations to avoid blocking UI
    setTimeout(async () => {
      try {
        if (direction === 'right') {
          await supabase.from('likes').insert({ user_id: user.id, product_id: currentProduct.id });
        } else if (direction === 'up') {
          let { data: wishlists } = await supabase.from('wishlists').select('id').eq('user_id', user.id).limit(1);
          let wishlistId = wishlists?.[0]?.id;
          if (!wishlistId) {
            const { data: newWishlist } = await supabase.from('wishlists').insert({ user_id: user.id, title: 'My Wishlist' }).select('id').single();
            wishlistId = newWishlist?.id;
          }
          await supabase.from('wishlist_items').insert({ wishlist_id: wishlistId, product_id: currentProduct.id });
        }
        SwipeAnalytics.trackSwipe(user.id, currentProduct.id, direction, currentProduct);
        swipeProduct.mutate({ productId: currentProduct.id, action: direction, userId: user.id });
      } catch (error) {
        console.error('Background swipe processing error:', error);
      }
    }, 300); // Wait for animation to complete

    // Immediately update UI
    setCurrentIndex(prev => prev + 1);
    setIsAnimating(false);
    x.set(0);
    y.set(0);
    setNextImagePreloaded(false); // Reset preload flag for next image
  }, [currentProduct, user, isAnimating, swipeProduct, x, y]);

  const handleProductDetail = useCallback(() => {
    if (currentProduct) {
      trackProductClick(currentProduct.id, 'swipe_deck_detail');
      setSelectedProduct(currentProduct);
      setIsDetailModalOpen(true);
    }
  }, [currentProduct, trackProductClick]);

  const handleSeenProductClick = useCallback((product: Product) => {
    trackProductClick(product.id, 'seen_deck_detail');
    setSelectedProduct(product);
    setIsDetailModalOpen(true);
  }, [trackProductClick]);

  const formatPrice = useCallback((cents: number, currency: string = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100), []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Sparkles className="animate-spin h-8 w-8 text-cartier-600" />
      </div>
    );
  }

  if (isAllCaughtUp) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-6">
        {/* Hero Message */}
        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-foreground">You're all caught up! ✨</h3>
          <p className="text-muted-foreground">Check back later for more curated finds</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center bg-muted p-1 rounded-lg" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'swipe'}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ring-cartier ${
              activeTab === 'swipe' 
                ? 'tab-cartier-active bg-background shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('swipe')}
          >
            Swipe Deck
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'seen'}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ring-cartier ${
              activeTab === 'seen' 
                ? 'tab-cartier-active bg-background shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('seen')}
          >
            Seen ({seenProducts.length})
          </button>
        </div>

        {/* Content */}
        {activeTab === 'seen' && seenProducts.length > 0 && (
          <div className="w-full max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-4 gap-3 p-4">
              {seenProducts.map((product, index) => (
                <MiniCard
                  key={`${product.id}-${index}`}
                  product={product}
                  swipeAction={product.swipeAction}
                  onClick={() => handleSeenProductClick(product)}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'seen' && seenProducts.length === 0 && (
          <div className="text-center text-muted-foreground">
            <p>No recently viewed items</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <motion.div
        drag={!isAnimating}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ 
          x, 
          y, 
          rotate, 
          opacity,
          willChange: 'transform' // Performance hint
        }}
        animate={isAnimating ? { 
          x: x.get() > 0 ? 300 : x.get() < 0 ? -300 : 0, 
          y: y.get() < 0 ? -300 : 0, 
          opacity: 0 
        } : {}}
        transition={{ ...springConfig, type: 'spring', duration: 0.3 }}
        className="absolute inset-0"
      >
        <Card className="w-full h-full shadow-2xl border-0 overflow-hidden bg-background">
          <div className="relative h-3/5">
            <img 
              src={currentProduct.media_urls[0] || '/placeholder.svg'} 
              alt={currentProduct.title} 
              className="w-full h-full object-cover" 
            />
            <div className="absolute top-4 right-4 bg-background/90 rounded-lg px-3 py-1.5 shadow-soft">
              {currentProduct.brand?.name}
            </div>
            <motion.div 
              style={{ opacity: loveOpacity }} 
              className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full font-medium shadow-lg"
            >
              <Heart className="inline w-4 h-4 mr-1" />LOVE
            </motion.div>
            <motion.div 
              style={{ opacity: passOpacity }} 
              className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full font-medium shadow-lg"
            >
              <X className="inline w-4 h-4 mr-1" />PASS
            </motion.div>
            <motion.div 
              style={{ opacity: wishlistOpacity }} 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-cartier-600 text-white px-4 py-2 rounded-full font-medium shadow-lg"
            >
              <Bookmark className="inline w-4 h-4 mr-1" />WISHLIST
            </motion.div>
            <Button 
              size="sm" 
              variant="secondary" 
              className="absolute bottom-4 right-4 bg-background/90" 
              onClick={handleProductDetail}
            >
              <Info className="h-4 w-4 mr-1" />Details
            </Button>
            {currentProduct.ar_mesh_url && (
              <Badge className="absolute bottom-4 left-4 bg-purple-500">
                <Camera className="h-3 w-3 mr-1" />AR Try-On
              </Badge>
            )}
          </div>
          <CardContent className="p-6 h-2/5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg line-clamp-2">{currentProduct.title}</h3>
                  <p className="text-muted-foreground">{currentProduct.brand?.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-cartier-600">
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
                    <Badge key={index} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Preview next card */}
      {products?.[currentIndex + 1] && (
        <div className="absolute inset-0 -z-10 scale-95 opacity-50">
          <Card className="w-full h-full shadow-xl border-0 overflow-hidden bg-background">
            <img 
              src={products[currentIndex + 1].media_urls[0] || '/placeholder.svg'} 
              alt={products[currentIndex + 1].title} 
              className="w-full h-full object-cover" 
            />
          </Card>
        </div>
      )}

      {/* Action Buttons */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
        <Button 
          size="lg" 
          variant="outline" 
          className="rounded-full w-12 h-12 border-red-200 hover:bg-red-50 ring-cartier" 
          onClick={() => handleSwipe('left')} 
          disabled={isAnimating}
        >
          <X className="h-5 w-5 text-red-500" />
        </Button>
        <Button 
          size="lg" 
          variant="outline" 
          className="rounded-full w-12 h-12 border-cartier-200 hover:bg-cartier-50 ring-cartier" 
          onClick={() => handleSwipe('up')} 
          disabled={isAnimating}
        >
          <Bookmark className="h-5 w-5 text-cartier-600" />
        </Button>
        <Button 
          size="lg" 
          variant="outline" 
          className="rounded-full w-12 h-12 border-green-200 hover:bg-green-50 ring-cartier" 
          onClick={() => handleSwipe('right')} 
          disabled={isAnimating}
        >
          <Heart className="h-5 w-5 text-green-500" />
        </Button>
      </div>

      <ProductDetailModal
        product={selectedProduct}
        isOpen={isDetailModalOpen}
        onClose={() => { setIsDetailModalOpen(false); setSelectedProduct(null); }}
        onAddToWishlist={(productId) => toast({ title: "Added to wishlist", description: "Product has been added to your wishlist." })}
        onAddToCart={(productId, size) => toast({ title: "Redirecting to shop", description: `Opening ${selectedProduct?.brand?.name}'s product page.` })}
      />
    </div>
  );
};

export default SwipeDeck;
