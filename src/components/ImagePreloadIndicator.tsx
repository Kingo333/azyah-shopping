import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Image, Loader2 } from 'lucide-react';
import { useImagePreloader } from '@/hooks/useImagePreloader';

interface ImagePreloadIndicatorProps {
  className?: string;
  minimal?: boolean;
}

export const ImagePreloadIndicator: React.FC<ImagePreloadIndicatorProps> = ({ 
  className = "",
  minimal = false 
}) => {
  const { isPreloading, progress } = useImagePreloader();

  if (!isPreloading || progress.total === 0) {
    return null;
  }

  if (minimal) {
    return (
      <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className}`}>
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Loading images... {progress.percentage}%</span>
      </div>
    );
  }

  return (
    <Card className={`p-3 bg-background/95 backdrop-blur-sm border shadow-sm ${className}`}>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-full">
          <Image className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Optimizing experience...</span>
            <span className="text-muted-foreground">
              {progress.completed} / {progress.total}
            </span>
          </div>
          <Progress 
            value={progress.percentage} 
            className="h-2" 
          />
          <div className="text-xs text-muted-foreground">
            Pre-loading images for smooth browsing
          </div>
        </div>
      </div>
    </Card>
  );
};