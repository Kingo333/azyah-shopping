import React, { useState, useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate, PanInfo } from 'framer-motion';
import { ArrowRight, Heart, X, ShoppingBag, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useUnifiedProducts } from '@/hooks/useUnifiedProducts';
import { useAddProductToWardrobe } from '@/hooks/useAddProductToWardrobe';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/hooks/useWishlist';
import { SmartImage } from '@/components/SmartImage';
import { HangerIcon } from '@/components/icons/HangerIcon';
import { openExternalUrl } from '@/lib/openExternalUrl';
import { swipeHaptics } from '@/utils/haptics';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Money } from '@/components/ui/Money';

interface MiniDiscoverProps {
  limit?: number;
  excludeProductIds?: string[];
  title?: string;
  subtitle?: string;
  category?: string;
  onCategoryChange?: (category: string) => void;
}

interface MiniProduct {
  id: string;
  title: string;
  price_cents: number;
  currency: string;
  image_url?: string;
  external_url?: string;
  brand?: { name: string };
  brands?: { name: string };
}

// Non-blocking guest notification helper
const showGuestToast = (action: string, navigate: (path: string) => void) => {
  toast(`Sign in to ${action}`, {
    description: 'Create an account to save your favorites',
    action: {
      label: 'Sign Up',
      onClick: () => navigate('/onboarding/signup')
    },
    duration: 3000,
  });
};

// Swipe card for mini discover - with StyleLinkCard action bar design
const MiniSwipeCard = memo(({ 
  product, 
  onSwipe
}: { 
  product: MiniProduct;
  onSwipe: () => void;
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { mutate: addToWardrobe, isPending } = useAddProductToWardrobe();
  const { addToWishlist, isLoading: wishlistLoading } = useWishlist();
  const [isAdded, setIsAdded] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  
  const x = useMotionValue(0);
  
  // Continuous smooth shake animation every 3 seconds until user interacts
  React.useEffect(() => {
    if (hasInteracted) return;
    
    let isMounted = true;
    
    const shakeSequence = async () => {
      if (!isMounted || hasInteracted) return;
      
      try {
        // Smooth sway animation matching IntroCarousel style
        await animate(x, -20, { duration: 0.4, ease: "easeInOut" });
        if (!isMounted || hasInteracted) return;
        
        await animate(x, 20, { duration: 0.6, ease: "easeInOut" });
        if (!isMounted || hasInteracted) return;
        
        await animate(x, 0, { duration: 0.4, ease: "easeInOut" });
      } catch {
        // Animation was interrupted
      }
    };
    
    // Initial shake after a short delay
    const initialTimer = setTimeout(shakeSequence, 800);
    
    // Repeat every 3 seconds
    const intervalId = setInterval(shakeSequence, 3000);
    
    return () => {
      isMounted = false;
      clearTimeout(initialTimer);
      clearInterval(intervalId);
    };
  }, [hasInteracted, x]);
  
  // Stop animation on any interaction
  const handleInteraction = useCallback(() => {
    setHasInteracted(true);
  }, []);
  const rotate = useTransform(x, [-150, 0, 150], [-10, 0, 10]);
  const opacity = useTransform(x, [-150, -75, 0, 75, 150], [0.6, 1, 1, 1, 0.6]);

  const handleDragStart = useCallback(() => {
    handleInteraction();
  }, [handleInteraction]);

  const handleAddToCloset = useCallback(() => {
    if (!user) {
      showGuestToast('add to your closet', navigate);
      return;
    }
    if (isPending || isAdded) return;
    swipeHaptics.selection();
    addToWardrobe(product as any, {
      onSuccess: () => setIsAdded(true)
    });
  }, [user, isPending, isAdded, addToWardrobe, product, navigate]);

  const handleLike = useCallback(async () => {
    if (!user) {
      showGuestToast('like items', navigate);
      return;
    }
    if (wishlistLoading || isLiked) return;
    swipeHaptics.like();
    await addToWishlist(product.id);
    setIsLiked(true);
  }, [user, wishlistLoading, isLiked, addToWishlist, product.id, navigate]);

  const handleSave = useCallback(async () => {
    if (!user) {
      showGuestToast('save items', navigate);
      return;
    }
    if (wishlistLoading) return;
    swipeHaptics.selection();
    await addToWishlist(product.id);
  }, [user, wishlistLoading, addToWishlist, product.id, navigate]);

  const handlePass = useCallback(() => {
    swipeHaptics.selection();
    onSwipe();
  }, [onSwipe]);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    const THRESHOLD = 80;
    
    const { offset, velocity } = info;
    const effectiveX = offset.x + velocity.x * 0.1;
    
    // Only horizontal swipes trigger actions - swipe-up does nothing
    // Swipe RIGHT = Like
    if (effectiveX > THRESHOLD) {
      swipeHaptics.like();
      handleLike();
      onSwipe();
    }
    // Swipe LEFT = Pass
    else if (effectiveX < -THRESHOLD) {
      swipeHaptics.selection();
      onSwipe();
    }
    
    // Smooth spring reset
    animate(x, 0, { type: "spring", stiffness: 300, damping: 25 });
  }, [x, onSwipe, handleLike]);

  const handleShop = useCallback(() => {
    if (product.external_url) {
      openExternalUrl(product.external_url);
    }
  }, [product.external_url]);

  const brandName = product.brand?.name || product.brands?.name;

  return (
    <div className="relative w-full max-w-[300px] mx-auto">
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onTouchStart={handleInteraction}
        onMouseDown={handleInteraction}
        style={{ x, rotate, opacity, willChange: 'transform' }}
        className="cursor-grab active:cursor-grabbing will-change-transform"
      >
        <Card className="overflow-hidden shadow-lg rounded-2xl">
          {/* Image container with overlay action bar */}
          <div className="relative aspect-[3/4] bg-muted">
            <SmartImage
              src={product.image_url || '/placeholder.svg'}
              alt={product.title}
              className="w-full h-full object-cover"
            />
            
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            
            {/* Top right: Closet button */}
            <div className="absolute top-3 right-3 z-10">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToCloset();
                }}
                disabled={isPending || isAdded}
                className={cn(
                  "h-auto px-2.5 py-1.5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background/90 shadow-md flex items-center gap-1.5 transition-all",
                  isAdded && "bg-green-500/90 text-white"
                )}
              >
                {isAdded ? (
                  <>
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    <span className="text-[10px] font-medium">Added</span>
                  </>
                ) : (
                  <>
                    <HangerIcon className="h-3.5 w-3.5" size={14} />
                    <span className="text-[10px] font-medium">Closet</span>
                  </>
                )}
              </Button>
            </div>
            
            {/* Bottom content area - product info only */}
            <div className="absolute bottom-0 left-0 right-0 z-10 pb-3">
              {/* Product info */}
              <div className="px-3 pt-3 pb-2 text-white">
                {brandName && (
                  <p className="text-[10px] font-medium opacity-80 mb-0.5">{brandName}</p>
                )}
                <p className="text-xs font-semibold line-clamp-1">{product.title}</p>
                <div className="flex items-center justify-between mt-1">
                  <Money cents={product.price_cents} currency={product.currency} className="text-sm font-bold" />
                  {product.external_url && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShop();
                      }}
                      className="h-6 px-2 rounded-full bg-primary/90 hover:bg-primary text-primary-foreground text-[9px] font-semibold"
                    >
                      <ShoppingBag className="h-3 w-3 mr-0.5" strokeWidth={2} />
                      Shop
                    </Button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Centered Pass/Like overlay - semi-transparent */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto">
              <div className="flex items-center gap-8 px-8 py-4 rounded-full bg-black/30 backdrop-blur-md">
                {/* Pass button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePass();
                  }}
                  className="flex flex-col items-center gap-1 text-white/90 hover:text-white transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-white/20 hover:bg-red-500/40 flex items-center justify-center transition-colors">
                    <X className="h-5 w-5" strokeWidth={2.5} />
                  </div>
                  <span className="text-[10px] font-medium">Pass</span>
                </button>
                
                {/* Like button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLike();
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1 transition-colors",
                    isLiked ? "text-pink-300" : "text-white/90 hover:text-pink-300"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                    isLiked ? "bg-pink-500/50" : "bg-white/20 hover:bg-pink-500/40"
                  )}>
                    <Heart className={cn("h-5 w-5", isLiked && "fill-current")} strokeWidth={2.5} />
                  </div>
                  <span className="text-[10px] font-medium">{isLiked ? 'Liked' : 'Like'}</span>
                </button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
      
      {/* AI learns hint only */}
      <div className="mt-3 text-center">
        <p className="text-[10px] text-muted-foreground/70 italic">
          ✨ AI learns your style
        </p>
      </div>
    </div>
  );
});
MiniSwipeCard.displayName = 'MiniSwipeCard';

// List item card
const MiniListCard = memo(({ product }: { product: MiniProduct }) => {
  const { user } = useAuth();
  const { mutate: addToWardrobe, isPending } = useAddProductToWardrobe();
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToCloset = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || isPending || isAdded) return;
    addToWardrobe(product as any, {
      onSuccess: () => setIsAdded(true)
    });
  }, [user, isPending, isAdded, addToWardrobe, product]);

  const handleShop = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.external_url) {
      openExternalUrl(product.external_url);
    }
  }, [product.external_url]);

  const brandName = product.brand?.name || product.brands?.name;
  const formatPrice = (cents: number, currency: string) => {
    const amount = cents / 100;
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: currency || 'USD' 
    }).format(amount);
  };

  return (
    <Card className="flex-shrink-0 w-32 overflow-hidden group hover:shadow-md transition-shadow">
      <Link to={`/swipe?product=${product.id}`} className="block">
        <div className="relative aspect-[3/4] bg-muted">
          <SmartImage
            src={product.image_url || '/placeholder.svg'}
            alt={product.title}
            className="w-full h-full object-cover"
          />
          
          {/* Hover overlay with actions */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
            <Button
              variant="secondary"
              size="icon"
              onClick={handleAddToCloset}
              disabled={isPending || isAdded || !user}
              className={cn(
                "h-7 w-7 rounded-full",
                isAdded && "bg-green-500 text-white"
              )}
            >
              {isAdded ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <HangerIcon className="h-3.5 w-3.5" size={14} />
              )}
            </Button>
            
            {product.external_url && (
              <Button
                variant="secondary"
                size="icon"
                onClick={handleShop}
                className="h-7 w-7 rounded-full"
              >
                <ShoppingBag className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
        
        <div className="p-1.5">
          {brandName && (
            <p className="text-[8px] text-muted-foreground truncate">{brandName}</p>
          )}
          <p className="text-[9px] font-medium truncate">{product.title}</p>
          <p className="text-[10px] font-semibold text-foreground">
            {formatPrice(product.price_cents, product.currency)}
          </p>
        </div>
      </Link>
    </Card>
  );
});
MiniListCard.displayName = 'MiniListCard';

// Category options for filter tabs
const DISCOVER_CATEGORIES = ['all', 'clothing', 'modestwear', 'footwear', 'bags', 'accessories', 'jewelry'] as const;

// Main MiniDiscover component
const MiniDiscover: React.FC<MiniDiscoverProps> = ({
  limit = 15,
  excludeProductIds = [],
  title = "Discover More",
  subtitle = "Swipe to explore styles",
  category = 'all',
  onCategoryChange
}) => {
  const [viewMode, setViewMode] = useState<'swipe' | 'list'>('swipe');
  const [recentlyShown, setRecentlyShown] = useState<Set<string>>(new Set());
  const [currentProduct, setCurrentProduct] = useState<MiniProduct | null>(null);
  
  const { products, isLoading, refetch } = useUnifiedProducts({
    category: category === 'all' ? undefined : category,
    limit,
    priceRange: { min: 0, max: 100000 },
  });
  
  // Reset current product when category changes
  React.useEffect(() => {
    setCurrentProduct(null);
    setRecentlyShown(new Set());
  }, [category]);
  
  // Filter out excluded products
  const filteredProducts = useMemo(() => {
    if (!products?.length) return [];
    if (!excludeProductIds?.length) return products.slice(0, limit);
    return products
      .filter(p => !excludeProductIds.includes(p.id))
      .slice(0, limit);
  }, [products, excludeProductIds, limit]);
  
  // Get a random product from available pool
  const getRandomProduct = useCallback(() => {
    if (!filteredProducts.length) return null;
    
    // Filter out recently shown products
    const availableProducts = filteredProducts.filter(p => !recentlyShown.has(p.id));
    
    // If all products were recently shown, reset and use full list
    const pool = availableProducts.length > 0 ? availableProducts : filteredProducts;
    
    // Pick random product
    const randomIndex = Math.floor(Math.random() * pool.length);
    return pool[randomIndex];
  }, [filteredProducts, recentlyShown]);
  
  // Initialize with random product
  React.useEffect(() => {
    if (filteredProducts.length && !currentProduct) {
      setCurrentProduct(getRandomProduct());
    }
  }, [filteredProducts, currentProduct, getRandomProduct]);
  
  // Handle swipe - get new random product
  const handleSwipe = useCallback(() => {
    const nextProduct = getRandomProduct();
    if (nextProduct) {
      setRecentlyShown(prev => {
        const newSet = new Set(prev);
        if (currentProduct) newSet.add(currentProduct.id);
        // Keep only last 5 to allow recycling
        if (newSet.size > 5) {
          const first = newSet.values().next().value;
          if (first) newSet.delete(first);
        }
        return newSet;
      });
      setCurrentProduct(nextProduct);
    }
  }, [currentProduct, getRandomProduct]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        <div className="h-[360px] w-full bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!filteredProducts.length) {
    return (
      <Card className="p-4 text-center bg-gradient-to-br from-primary/5 to-transparent">
        <p className="text-sm text-muted-foreground mb-3">
          Discover products that match your style
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/swipe">
            Browse All
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-[10px] text-muted-foreground">{subtitle}</p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex bg-muted rounded-full p-0.5">
            <button
              onClick={() => setViewMode('swipe')}
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors",
                viewMode === 'swipe' 
                  ? "bg-background shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Swipe
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors",
                viewMode === 'list' 
                  ? "bg-background shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              List
            </button>
          </div>
          
          {/* Browse All link - passes selected category */}
          <Button variant="ghost" size="sm" asChild className="text-[hsl(var(--azyah-maroon))] gap-1 h-7 px-2 text-[10px]">
            <Link to={`/swipe${category && category !== 'all' ? `?category=${category}` : ''}`}>
              Browse All
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Category Filter Tabs */}
      {onCategoryChange && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          {DISCOVER_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors",
                category === cat 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      )}
      
      {/* Content */}
      <AnimatePresence mode="wait">
        {viewMode === 'swipe' ? (
          <motion.div
            key="swipe"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            className="py-2"
          >
            {currentProduct && (
              <MiniSwipeCard
                key={currentProduct.id}
                product={currentProduct}
                onSwipe={handleSwipe}
              />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {filteredProducts.map((product) => (
                <MiniListCard key={product.id} product={product} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MiniDiscover;
