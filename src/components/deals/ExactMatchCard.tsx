import React from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExactMatch } from '@/hooks/useDealsUnified';

interface ExactMatchCardProps {
  result: ExactMatch;
  className?: string;
}

export function ExactMatchCard({ result, className }: ExactMatchCardProps) {
  const handleOpen = () => {
    window.open(result.link, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl",
        "bg-gradient-to-br from-amber-50/80 to-orange-50/60",
        "dark:from-amber-950/30 dark:to-orange-950/20",
        "backdrop-blur-xl",
        "border-2 border-amber-300/50 dark:border-amber-600/30",
        "shadow-[0_4px_24px_rgba(245,158,11,0.15)]",
        "hover:shadow-[0_8px_32px_rgba(245,158,11,0.25)]",
        "transition-all duration-200",
        className
      )}
    >
      {/* "Original Found" badge */}
      <div className="px-3 py-1.5 bg-gradient-to-r from-amber-500/90 to-orange-500/90 backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-white" />
          <span className="text-xs font-semibold text-white">
            Original Item Found
          </span>
        </div>
      </div>

      <div className="flex gap-3 p-3">
        {/* Thumbnail */}
        <div className="w-20 h-20 flex-shrink-0 bg-white/50 dark:bg-white/10 rounded-xl overflow-hidden">
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
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            {/* Source/Brand */}
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 truncate">
              {result.source}
            </p>
            {/* Price */}
            {result.price && (
              <p className="text-lg font-bold text-foreground mt-0.5">
                {result.price}
              </p>
            )}
          </div>

          <div className="flex items-end justify-between mt-1">
            <div className="min-w-0 flex-1 mr-2">
              {/* Title */}
              <h3 className="text-[11px] text-muted-foreground/80 line-clamp-2 leading-tight">
                {result.title}
              </h3>
            </div>

            <Button
              size="icon"
              className="
                w-8 h-8 rounded-full flex-shrink-0
                bg-gradient-to-br from-amber-500 to-orange-500
                hover:from-amber-600 hover:to-orange-600
                text-white
                shadow-lg
              "
              onClick={handleOpen}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExactMatchCard;
