import React from 'react';
import { Button } from '@/components/ui/button';
import { Heart, X, ArrowRight } from 'lucide-react';
import { SmartImage } from '@/components/SmartImage';
import type { Product } from '@/types';

interface MiniSwipePreviewProps {
  products: Product[];
  onOpenFullSwipe: () => void;
  onLike: (product: Product) => void;
  onSkip: (product: Product) => void;
}

export const MiniSwipePreview: React.FC<MiniSwipePreviewProps> = ({
  products,
  onOpenFullSwipe,
  onLike,
  onSkip,
}) => {
  if (products.length === 0) return null;

  return (
    <section className="py-4 bg-background">
      <div className="flex items-center justify-between mb-3 px-4">
        <h2 className="text-sm font-serif font-medium text-foreground">Quick Swipe</h2>
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
      
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory scrollbar-hide">
        {products.slice(0, 6).map((product) => (
          <MiniSwipeCard
            key={product.id}
            product={product}
            onLike={() => onLike(product)}
            onSkip={() => onSkip(product)}
          />
        ))}
      </div>
    </section>
  );
};

interface MiniSwipeCardProps {
  product: Product;
  onLike: () => void;
  onSkip: () => void;
}

const MiniSwipeCard: React.FC<MiniSwipeCardProps> = ({ product, onLike, onSkip }) => {
  const imageUrl = product.media_urls?.[0] || product.image_url || '/placeholder.svg';
  const brandName = product.merchant_name || product.brand?.name || 'Unknown';

  return (
    <div className="flex-shrink-0 w-28 snap-start">
      <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-muted border border-border shadow-sm">
        <SmartImage
          src={imageUrl}
          alt={product.title}
          className="w-full h-full object-cover"
        />
        
        {/* Brand overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
          <p className="text-[10px] font-medium text-white truncate">{brandName}</p>
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="flex gap-2 mt-2 justify-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSkip();
          }}
          className="w-8 h-8 rounded-full bg-muted hover:bg-destructive/10 border border-border flex items-center justify-center transition-colors"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLike();
          }}
          className="w-8 h-8 rounded-full bg-muted hover:bg-[hsl(var(--azyah-maroon))]/10 border border-border flex items-center justify-center transition-colors"
        >
          <Heart className="h-3.5 w-3.5 text-[hsl(var(--azyah-maroon))]" />
        </button>
      </div>
    </div>
  );
};

export default MiniSwipePreview;
