import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ExternalLink, Store } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CatalogMatch {
  id: string;
  title: string;
  price_cents: number;
  currency: string;
  media_url: string;
  category_slug: string | null;
  brand_name: string | null;
  match_score: number;
}

interface AzyahMatchesSectionProps {
  matches: CatalogMatch[];
  isLoading?: boolean;
  className?: string;
}

export function AzyahMatchesSection({ matches, isLoading, className }: AzyahMatchesSectionProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center gap-2 px-1">
          <Store className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Similar on Azyah</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i}
              className="h-32 bg-white/30 dark:bg-white/5 backdrop-blur-sm animate-pulse rounded-xl"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!matches || matches.length === 0) {
    return null;
  }

  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: currency || 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  const handleProductClick = (productId: string) => {
    navigate(`/products/${productId}`);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 px-1">
        <Store className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Similar on Azyah</h3>
        <span className="text-[10px] text-muted-foreground/70 bg-muted/30 px-1.5 py-0.5 rounded-full">
          {matches.length} found
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {matches.slice(0, 8).map((match) => (
          <div
            key={match.id}
            onClick={() => handleProductClick(match.id)}
            className={cn(
              "overflow-hidden rounded-xl cursor-pointer",
              "bg-white/60 dark:bg-white/10",
              "backdrop-blur-xl",
              "border border-white/30 dark:border-white/10",
              "shadow-sm",
              "hover:shadow-md hover:bg-white/80 dark:hover:bg-white/15",
              "transition-all duration-200",
              "group"
            )}
          >
            {/* Image */}
            <div className="aspect-square bg-white/50 dark:bg-white/5 overflow-hidden">
              {match.media_url ? (
                <img
                  src={match.media_url}
                  alt={match.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
                  <Store className="h-8 w-8" />
                </div>
              )}
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AzyahMatchesSection;
