import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, ImageIcon, Link2, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScanPanelProps {
  type: 'photo' | 'link' | 'search';
  thumbnail?: string | null;
  title?: string;
  isLoading: boolean;
  dealsFound?: number;
  onReset?: () => void;
  className?: string;
}

export function ScanPanel({
  type,
  thumbnail,
  title,
  isLoading,
  dealsFound,
  onReset,
  className,
}: ScanPanelProps) {
  const TypeIcon = type === 'photo' ? ImageIcon : type === 'link' ? Link2 : Search;

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3",
        "bg-white/50 dark:bg-white/10",
        "backdrop-blur-xl",
        "rounded-2xl",
        "border border-white/20",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]",
        className
      )}
    >
      {/* Thumbnail or icon */}
      <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/30 dark:bg-white/5 backdrop-blur-sm flex-shrink-0 flex items-center justify-center">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt="Scanned"
            className="w-full h-full object-cover"
          />
        ) : (
          <TypeIcon className="h-6 w-6 text-muted-foreground" />
        )}
      </div>

      {/* Status */}
      <div className="flex-1 min-w-0">
        {title && (
          <p className="text-xs text-muted-foreground/80 truncate mb-0.5">{title}</p>
        )}
        
        {isLoading ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
              <span className="text-sm font-medium">Scanning the web...</span>
            </div>
            {/* Shimmer bar */}
            <div className="h-1.5 w-full rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
              <div className="h-full w-full animate-shimmer" />
            </div>
          </div>
        ) : dealsFound !== undefined && dealsFound > 0 ? (
          <div className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-green-500" />
            <span className="text-sm font-medium text-green-600 dark:text-green-400">
              {dealsFound}+ deals found
            </span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Ready to scan</span>
        )}
      </div>

      {/* Reset button */}
      {!isLoading && onReset && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-8 px-3 text-xs rounded-full bg-white/50 dark:bg-white/10 hover:bg-white/70 dark:hover:bg-white/20"
        >
          Try another
        </Button>
      )}
    </div>
  );
}

export default ScanPanel;
