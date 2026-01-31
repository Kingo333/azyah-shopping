import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, ChevronRight, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import useEmblaCarousel from 'embla-carousel-react';
import { displaySrc } from '@/lib/displaySrc';

interface CatalogMatch {
  id: string;
  title: string;
  price_cents: number;
  currency: string;
  media_url: string;
  category_slug: string | null;
  brand_name: string | null;
  match_score: number;
  affiliate_url?: string | null;
  external_url?: string | null;
}

interface AzyahMatchesSectionProps {
  matches: CatalogMatch[];
  isLoading?: boolean;
  className?: string;
}

export function AzyahMatchesSection({ matches, isLoading, className }: AzyahMatchesSectionProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [emblaRef] = useEmblaCarousel({ 
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: false,
    skipSnaps: false,
  });

  // Get display image URL using centralized displaySrc helper
  // Handles malformed URLs (JSON array stored as string)
  const getDisplayImageUrl = useCallback((url: string | null | undefined): string => {
    if (!url) return '/placeholder.svg';
    
    // Clean up JSON array strings that may have been passed incorrectly
    let cleanUrl = url.trim();
    if (cleanUrl.startsWith('[') || cleanUrl.startsWith('"[')) {
      try {
        // Handle double-encoded or single-encoded JSON
        const decoded = cleanUrl.startsWith('"') ? JSON.parse(cleanUrl) : cleanUrl;
        const parsed = typeof decoded === 'string' && decoded.startsWith('[') 
          ? JSON.parse(decoded) 
          : decoded;
        cleanUrl = Array.isArray(parsed) ? (parsed[0] || '') : cleanUrl;
      } catch {
        console.warn('[AzyahMatches] Failed to parse media_url:', url.substring(0, 50));
        return '/placeholder.svg';
      }
    }
    
    if (!cleanUrl || cleanUrl.length < 5) return '/placeholder.svg';
    
    return displaySrc(cleanUrl);
  }, []);

  const formatPrice = useCallback((cents: number, currency: string) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: currency || 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  }, []);

  const handleProductClick = useCallback((productId: string) => {
    navigate(`/products/${productId}`);
  }, [navigate]);

  const handleShopClick = useCallback((e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const handleExpandToggle = useCallback(() => {
    setExpanded(prev => !prev);
  }, []);

  // Get external link for product
  const getExternalLink = useCallback((match: CatalogMatch): string | null => {
    return match.affiliate_url || match.external_url || null;
  }, []);

  // Show 6 products in carousel, 8 in expanded grid
  const displayMatches = expanded ? matches.slice(0, 8) : matches.slice(0, 6);
  const hasMore = matches.length > 6;

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center gap-2 px-1">
          <Store className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Similar on Azyah</h3>
        </div>
        <div className="flex gap-2 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div 
              key={i}
              className="h-40 w-28 flex-shrink-0 bg-white/30 dark:bg-white/5 backdrop-blur-sm animate-pulse rounded-xl"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!matches || matches.length === 0) {
    return null;
  }

  // Carousel card component
  const ProductCard = ({ match, compact = false }: { match: CatalogMatch; compact?: boolean }) => {
    const externalLink = getExternalLink(match);
    const imageUrl = getDisplayImageUrl(match.media_url);
    
    return (
      <div
        onClick={() => handleProductClick(match.id)}
        className={cn(
          "overflow-hidden rounded-xl cursor-pointer flex-shrink-0",
          "bg-white/60 dark:bg-white/10",
          "backdrop-blur-xl",
          "border border-white/30 dark:border-white/10",
          "shadow-sm",
          "hover:shadow-md hover:bg-white/80 dark:hover:bg-white/15",
          "transition-all duration-200",
          "group",
          compact ? "w-28" : ""
        )}
      >
        {/* Image */}
        <div className={cn(
          "bg-white/50 dark:bg-white/5 overflow-hidden relative",
          compact ? "aspect-[3/4]" : "aspect-square"
        )}>
          <img
            src={imageUrl}
            alt={match.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={(e) => {
              console.warn('[AzyahMatches] Image load failed:', match.media_url?.substring(0, 80));
              (e.currentTarget as HTMLImageElement).src = '/placeholder.svg';
            }}
          />
        </div>

        {/* Content */}
        <div className="p-2">
          {/* Brand */}
          {match.brand_name && (
            <p className="text-[10px] font-medium text-muted-foreground/80 truncate">
              {match.brand_name}
            </p>
          )}
          
          {/* Price */}
          <p className="text-sm font-bold text-foreground">
            {formatPrice(match.price_cents, match.currency)}
          </p>
          
          {/* Title */}
          <p className="text-[10px] text-muted-foreground/70 line-clamp-1 mt-0.5">
            {match.title}
          </p>

          {/* Shop button if external link exists */}
          {externalLink && (
            <button
              onClick={(e) => handleShopClick(e, externalLink)}
              className="mt-2 w-full flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors"
            >
              Shop
              <ExternalLink className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    );
  };

  // Expanded grid view
  if (expanded) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Similar on Azyah</h3>
            <span className="text-[10px] text-muted-foreground/70 bg-muted/30 px-1.5 py-0.5 rounded-full">
              {matches.length} found
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleExpandToggle();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
          >
            Show less
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {displayMatches.map((match) => (
            <ProductCard key={match.id} match={match} />
          ))}
        </div>
      </div>
    );
  }

  // Carousel view (default - 6 cards, 3 visible at a time)
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Similar on Azyah</h3>
          <span className="text-[10px] text-muted-foreground/70 bg-muted/30 px-1.5 py-0.5 rounded-full">
            {matches.length} found
          </span>
        </div>
        {hasMore && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleExpandToggle();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
          >
            View more
            <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </div>

      <div 
        className="overflow-hidden touch-pan-x" 
        ref={emblaRef}
        style={{ touchAction: 'pan-x' }}
        data-vaul-no-drag
      >
        <div className="flex gap-2">
          {displayMatches.map((match) => (
            <ProductCard key={match.id} match={match} compact />
          ))}
        </div>
      </div>
    </div>
  );
}

export default AzyahMatchesSection;
