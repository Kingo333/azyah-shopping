import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SmartImage } from '@/components/SmartImage';
import { useLikedProducts } from '@/hooks/useLikedProducts';
import { getPrimaryImageUrl } from '@/utils/imageHelpers';

export const FavoritesSection: React.FC = () => {
  const navigate = useNavigate();
  const { likedProducts, isLoading, hasLikedProducts, error } = useLikedProducts();

  // Show first 6 liked products in carousel
  const previewItems = (likedProducts || []).slice(0, 6);

  return (
    <section className="px-4 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-serif font-medium text-foreground">Your favorites</h2>
        {hasLikedProducts && (
          <Button
            variant="link"
            size="sm"
            className="text-xs p-0 h-auto text-muted-foreground hover:text-foreground gap-1"
            onClick={() => navigate('/favorites?tab=likes')}
          >
            View all
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex gap-1.5 overflow-hidden">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-[90px] h-[120px] flex-shrink-0 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : error && !hasLikedProducts ? (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-destructive/30 bg-destructive/5 p-3">
          <Heart className="h-6 w-6 text-destructive/40 flex-shrink-0" />
          <p className="text-xs text-muted-foreground flex-1">Couldn't load favorites. Try again later.</p>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full text-[10px] h-7 px-3 flex-shrink-0"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      ) : !hasLikedProducts ? (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-card/50 p-3">
          <Heart className="h-6 w-6 text-muted-foreground/40 flex-shrink-0" />
          <p className="text-xs text-muted-foreground flex-1">Save items you love, find them later.</p>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full text-[10px] h-7 px-3 flex-shrink-0"
            onClick={() => navigate('/swipe')}
          >
            Find items
          </Button>
        </div>
      ) : (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1">
          {previewItems.map((product: any) => {
            const imageUrl = getPrimaryImageUrl(product);
            const brandName = product.brands?.name || '';
            return (
              <div
                key={product.id}
                className="w-[90px] flex-shrink-0 rounded-xl overflow-hidden bg-muted cursor-pointer group snap-start"
                onClick={() => navigate(`/p/${product.id}`)}
              >
                <div className="relative aspect-[3/4] overflow-hidden">
                  <SmartImage
                    src={imageUrl}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                  {/* Brand name overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-1.5 pt-4">
                    <p className="text-[9px] text-white font-medium truncate">{brandName}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
