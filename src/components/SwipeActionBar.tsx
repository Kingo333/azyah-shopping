import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, X, Star, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeActionBarProps {
  onLike: () => void;
  onDislike: () => void;
  onWishlist: () => void;
  onShopNow?: (e: React.MouseEvent) => void;
  wishlistLoading?: boolean;
  hasExternalUrl?: boolean;
  className?: string;
}

export const SwipeActionBar = memo(({
  onLike,
  onDislike,
  onWishlist,
  onShopNow,
  wishlistLoading = false,
  hasExternalUrl = false,
  className
}: SwipeActionBarProps) => {
  return (
    <div className={cn(
      "flex items-center justify-center gap-3 w-full px-4",
      className
    )}>
      {/* Pass Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          onDislike();
        }}
        className="h-14 w-14 rounded-full border-2 border-destructive/20 bg-background/80 backdrop-blur-sm hover:bg-destructive/10 hover:border-destructive hover:scale-110 transition-all duration-200 shadow-lg"
      >
        <X className="h-6 w-6 text-destructive" strokeWidth={2.5} />
      </Button>

      {/* Wishlist Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          onWishlist();
        }}
        disabled={wishlistLoading}
        className="h-14 w-14 rounded-full border-2 border-primary/20 bg-background/80 backdrop-blur-sm hover:bg-primary/10 hover:border-primary hover:scale-110 transition-all duration-200 shadow-lg"
      >
        <Star className="h-6 w-6 text-primary" strokeWidth={2.5} />
      </Button>

      {/* Like Button */}
      <Button
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          onLike();
        }}
        className="h-16 w-16 rounded-full bg-gradient-to-br from-primary via-primary to-primary/80 hover:from-primary/90 hover:via-primary hover:to-primary/70 hover:scale-110 transition-all duration-200 shadow-xl shadow-primary/25"
      >
        <Heart className="h-7 w-7 text-primary-foreground" fill="currentColor" strokeWidth={2} />
      </Button>

      {/* Shop Now Button (if external URL exists) */}
      {hasExternalUrl && onShopNow && (
        <Button
          variant="outline"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onShopNow(e);
          }}
          className="h-14 w-14 rounded-full border-2 border-accent/20 bg-background/80 backdrop-blur-sm hover:bg-accent/10 hover:border-accent hover:scale-110 transition-all duration-200 shadow-lg"
        >
          <ExternalLink className="h-5 w-5 text-accent-foreground" strokeWidth={2.5} />
        </Button>
      )}
    </div>
  );
});

SwipeActionBar.displayName = 'SwipeActionBar';
