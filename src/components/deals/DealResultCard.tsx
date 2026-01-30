import React from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DealResult {
  title: string;
  link: string;
  thumbnail: string;
  source: string;
  price: string;
  extracted_price: number | null;
  rating?: number;
  reviews?: number;
}

interface DealResultCardProps {
  result: DealResult;
  isBestDeal?: boolean;
  className?: string;
}

export function DealResultCard({ result, isBestDeal, className }: DealResultCardProps) {
  const handleOpenDeal = () => {
    window.open(result.link, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      className={cn(
        "overflow-hidden rounded-2xl",
        "bg-white/60 dark:bg-white/10",
        "backdrop-blur-xl",
        "border border-white/30 dark:border-white/10",
        "shadow-[0_4px_24px_rgba(0,0,0,0.06)]",
        "hover:shadow-[0_8px_32px_rgba(0,0,0,0.1)]",
        "hover:bg-white/80 dark:hover:bg-white/15",
        "transition-all duration-200",
        className
      )}
    >
      <div className="flex gap-3 p-3">
        {/* Thumbnail */}
        <div className="w-18 h-18 flex-shrink-0 bg-white/50 dark:bg-white/10 rounded-xl overflow-hidden relative">
          {result.thumbnail ? (
            <img 
              src={result.thumbnail} 
              alt={result.title}
              className="w-full h-full object-cover"
              style={{ width: '72px', height: '72px' }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs" style={{ width: '72px', height: '72px' }}>
              No image
            </div>
          )}
          
          {isBestDeal && (
            <span className="
              absolute top-1 left-1 
              bg-green-500/90 backdrop-blur-sm
              text-white text-[9px] font-semibold
              px-1.5 py-0.5 rounded-full
              shadow-[0_0_8px_rgba(34,197,94,0.4)]
            ">
              Best Deal
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-medium line-clamp-2 leading-tight">
              {result.title}
            </h3>
            <p className="text-[10px] text-muted-foreground/80 mt-0.5">
              {result.source}
            </p>
          </div>

          <div className="flex items-center justify-between mt-2">
            <div>
              <p className="text-lg font-bold text-foreground">
                {result.price || 'Price unavailable'}
              </p>
              {result.rating && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80">
                  <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                  <span>{result.rating}</span>
                  {result.reviews && (
                    <span>({result.reviews.toLocaleString()})</span>
                  )}
                </div>
              )}
            </div>

            <Button 
              size="icon"
              className="
                w-8 h-8 rounded-full
                bg-amber-500/90 hover:bg-amber-500
                text-white
                shadow-[0_2px_8px_rgba(251,191,36,0.3)]
                hover:shadow-[0_4px_12px_rgba(251,191,36,0.4)]
              "
              onClick={handleOpenDeal}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DealResultCard;
