import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    <Card 
      className={cn(
        "overflow-hidden hover:shadow-md transition-shadow",
        isBestDeal && "ring-2 ring-green-500/50",
        className
      )}
    >
      <div className="flex gap-3 p-3">
        {/* Thumbnail */}
        <div className="w-20 h-20 flex-shrink-0 bg-muted rounded-lg overflow-hidden relative">
          {result.thumbnail ? (
            <img 
              src={result.thumbnail} 
              alt={result.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
              No image
            </div>
          )}
          
          {isBestDeal && (
            <Badge className="absolute top-1 left-1 bg-green-500 text-white text-[9px] px-1.5 py-0.5">
              Best Deal
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-medium line-clamp-2 leading-tight">
              {result.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {result.source}
            </p>
          </div>

          <div className="flex items-center justify-between mt-2">
            <div>
              <p className="text-base font-bold text-foreground">
                {result.price || 'Price unavailable'}
              </p>
              {result.rating && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span>{result.rating}</span>
                  {result.reviews && (
                    <span>({result.reviews.toLocaleString()})</span>
                  )}
                </div>
              )}
            </div>

            <Button 
              size="sm" 
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={handleOpenDeal}
            >
              Open
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default DealResultCard;
