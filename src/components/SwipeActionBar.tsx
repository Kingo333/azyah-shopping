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
  variant?: 'default' | 'card'; // card = StyleLinkCard design
}

export const SwipeActionBar = memo(({
  onLike,
  onDislike,
  onWishlist,
  onShopNow,
  wishlistLoading = false,
  hasExternalUrl = false,
  className,
  variant = 'default'
}: SwipeActionBarProps) => {
  // StyleLinkCard-style design (clean, bordered buttons with labels)
  if (variant === 'card') {
    return (
      <div className={cn(
        "flex items-center bg-background/95 backdrop-blur-sm rounded-2xl shadow-lg border border-border/50 overflow-hidden",
        className
      )}>
        {/* Pass Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDislike();
          }}
          className="flex items-center gap-1.5 px-4 py-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors border-r border-border/50"
        >
          <X className="h-4 w-4" strokeWidth={2} />
          <span className="text-xs font-medium">Pass</span>
        </button>

        {/* Wishlist/Save Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onWishlist();
          }}
          disabled={wishlistLoading}
          className="flex items-center gap-1.5 px-4 py-2.5 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors border-r border-border/50 disabled:opacity-50"
        >
          <Star className="h-4 w-4" strokeWidth={2} />
          <span className="text-xs font-medium">Save</span>
        </button>

        {/* Like Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLike();
          }}
          className="flex items-center gap-1.5 px-4 py-2.5 text-muted-foreground hover:text-pink-500 hover:bg-pink-50 transition-colors border-r border-border/50 last:border-r-0"
        >
          <Heart className="h-4 w-4" strokeWidth={2} />
          <span className="text-xs font-medium">Like</span>
        </button>

        {/* Shop Now Button (if external URL exists) */}
        {hasExternalUrl && onShopNow && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShopNow(e);
            }}
            className="flex items-center justify-center px-3 py-2.5 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            <ExternalLink className="h-4 w-4" strokeWidth={2} />
          </button>
        )}
      </div>
    );
  }

  // Default circular button design
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
