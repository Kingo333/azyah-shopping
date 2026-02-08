import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SmartImage } from '@/components/SmartImage';
import { useLikedProducts } from '@/hooks/useLikedProducts';

export const FavoritesSection: React.FC = () => {
  const navigate = useNavigate();
  const { likedProducts, isLoading, hasLikedProducts } = useLikedProducts();

  // Show first 4 liked products in carousel
  const previewItems = (likedProducts || []).slice(0, 4);

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
        <div className="flex gap-2 overflow-hidden">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-[120px] h-[120px] flex-shrink-0 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : !hasLikedProducts ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
          <Heart className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">Save items you love</p>
          <p className="text-xs text-muted-foreground mb-4">
            Find them later, all in one place.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full text-xs"
            onClick={() => navigate('/swipe')}
          >
            Find items
          </Button>
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1">
          {previewItems.map((product: any) => {
            const imageUrl =
              (product.media_urls as any)?.[0] || '/placeholder.svg';
            return (
              <div
                key={product.id}
                className="w-[120px] h-[120px] flex-shrink-0 rounded-xl overflow-hidden bg-muted cursor-pointer hover:opacity-90 transition-opacity snap-start"
                onClick={() => navigate(`/p/${product.id}`)}
              >
                <SmartImage
                  src={imageUrl}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
