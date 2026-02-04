import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, MoveHorizontal, Shirt, Info } from 'lucide-react';
import { SmartImage } from '@/components/SmartImage';
import { motion, PanInfo, useMotionValue, useTransform, animate } from 'framer-motion';
import type { Product } from '@/types';

interface MiniSwipePreviewProps {
  products: Product[];
  onOpenFullSwipe: () => void;
  onLike: (product: Product) => void;
  onSkip: (product: Product) => void;
  onInfoClick?: (product: Product) => void;
  onTryOnClick?: (product: Product) => void;
}

const DISTANCE_THRESHOLD = 80;

export const MiniSwipePreview: React.FC<MiniSwipePreviewProps> = ({
  products,
  onOpenFullSwipe,
  onLike,
  onSkip,
  onInfoClick,
  onTryOnClick,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Motion values for swipe effect
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-150, 0, 150], [-10, 0, 10]);
  const opacity = useTransform(x, [-150, -75, 0, 75, 150], [0.6, 1, 1, 1, 0.6]);
  
  // Like/Skip overlays
  const likeOpacity = useTransform(x, [0, 60], [0, 1]);
  const skipOpacity = useTransform(x, [-60, 0], [1, 0]);

  const currentProduct = products[currentIndex];

  // Sway animation to demonstrate interaction
  useEffect(() => {
    if (hasInteracted || products.length === 0) return;

    const runSwayAnimation = async () => {
      if (hasInteracted) return;
      await animate(x, -30, { duration: 0.5, ease: "easeInOut" });
      await animate(x, 30, { duration: 0.7, ease: "easeInOut" });
      await animate(x, 0, { duration: 0.5, ease: "easeInOut" });
    };

    const timeout = setTimeout(runSwayAnimation, 1000);
    const interval = setInterval(runSwayAnimation, 5000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [hasInteracted, x, products.length]);

  const handleSwipeEnd = useCallback((event: any, info: PanInfo) => {
    if (!currentProduct) return;
    
    setHasInteracted(true);
    const { offset } = info;

    if (offset.x > DISTANCE_THRESHOLD) {
      // Swipe right - LIKE
      onLike(currentProduct);
      setCurrentIndex(prev => (prev + 1) % products.length);
      animate(x, 0, { type: "spring", stiffness: 300, damping: 25 });
    } else if (offset.x < -DISTANCE_THRESHOLD) {
      // Swipe left - SKIP
      onSkip(currentProduct);
      setCurrentIndex(prev => (prev + 1) % products.length);
      animate(x, 0, { type: "spring", stiffness: 300, damping: 25 });
    } else {
      // Return to center
      animate(x, 0, { type: "spring", stiffness: 150, damping: 20 });
    }
  }, [currentProduct, products.length, x, onLike, onSkip]);

  if (products.length === 0) return null;

  const imageUrl = currentProduct?.media_urls?.[0] || currentProduct?.image_url || '/placeholder.svg';
  const brandName = currentProduct?.merchant_name || currentProduct?.brand?.name || 'Unknown';

  return (
    <section className="py-1 bg-background">
      <div className="flex items-center justify-between mb-1.5 px-4">
        <h2 className="text-base font-serif font-medium text-foreground">Quick Swipe</h2>
        <Button 
          variant="link" 
          size="sm" 
          onClick={onOpenFullSwipe}
          className="text-[hsl(var(--azyah-maroon))] hover:text-[hsl(var(--azyah-maroon))]/80 text-xs p-0 h-auto gap-1"
        >
          Open Full Swipe
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
      
      {/* Single swipeable card */}
      <div className="px-4">
        <div className="relative w-full max-w-[220px] mx-auto aspect-[3/4] overflow-visible">
          <motion.div
            className="w-full h-full bg-card rounded-2xl shadow-lg overflow-hidden cursor-grab active:cursor-grabbing relative border border-border"
            style={{ x, rotate, opacity }}
            drag="x"
            dragElastic={0.15}
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleSwipeEnd}
          >
            {/* Product Image */}
            <SmartImage
              src={imageUrl}
              alt={currentProduct?.title || 'Product'}
              className="w-full h-full object-cover select-none pointer-events-none"
            />

            {/* RIGHT: Try-On + Info buttons - stacked vertically */}
            <div className="absolute top-2 right-2 flex flex-col items-end gap-1.5 z-10">
              {/* Virtual Try-On button */}
              {onTryOnClick && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTryOnClick(currentProduct);
                  }}
                  className="h-auto px-2 py-1 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background/90 shadow-md flex items-center gap-1 transition-all"
                  title="Virtual Try-On"
                >
                  <Shirt className="h-3 w-3" strokeWidth={2} />
                  <span className="text-[9px] font-medium">Try On</span>
                </Button>
              )}
              
              {/* Info button */}
              {onInfoClick && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onInfoClick(currentProduct);
                  }}
                  className="h-6 w-6 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background/90 shadow-md"
                >
                  <Info className="h-3 w-3" strokeWidth={2.5} />
                </Button>
              )}
            </div>

            {/* Like Overlay */}
            <motion.div 
              className="absolute inset-0 bg-green-500/20 pointer-events-none flex items-center justify-center"
              style={{ opacity: likeOpacity }}
            >
              <span className="text-2xl font-bold text-green-600 bg-white/90 px-4 py-2 rounded-full">LIKE</span>
            </motion.div>

            {/* Skip Overlay */}
            <motion.div 
              className="absolute inset-0 bg-red-500/20 pointer-events-none flex items-center justify-center"
              style={{ opacity: skipOpacity }}
            >
              <span className="text-2xl font-bold text-red-600 bg-white/90 px-4 py-2 rounded-full">SKIP</span>
            </motion.div>

            {/* Swipe Instruction */}
            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-full pointer-events-none">
              <MoveHorizontal className="w-2.5 h-2.5 text-white" />
              <span className="text-white text-[9px] font-medium whitespace-nowrap">Swipe to train</span>
            </div>

            {/* Brand Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2.5">
              <p className="text-xs font-medium text-white truncate">{brandName}</p>
              <p className="text-[10px] text-white/80 truncate">{currentProduct?.title}</p>
            </div>
          </motion.div>

          {/* Pagination Dots */}
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex gap-1">
            {products.slice(0, 6).map((_, index) => (
              <div
                key={index}
                className={`h-1 rounded-full transition-all ${
                  index === currentIndex ? 'w-4 bg-[hsl(var(--azyah-maroon))]' : 'w-1 bg-muted-foreground/40'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default MiniSwipePreview;
