import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const SwipeLoadingCard = memo(() => {
  return (
    <Card className="w-full max-w-md mx-auto rounded-3xl overflow-hidden shadow-xl border-0">
      <CardContent className="p-0">
        {/* Image skeleton */}
        <div className="relative w-full aspect-[9/16] bg-gradient-to-br from-muted/50 to-muted">
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
          
          {/* Shimmer effect */}
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          
          {/* Top badges skeleton */}
          <div className="absolute top-4 left-4 flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          
          {/* Bottom info skeleton */}
          <div className="absolute bottom-0 left-0 right-0 p-6 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
            
            {/* Action buttons skeleton */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <Skeleton className="h-14 w-14 rounded-full" />
              <Skeleton className="h-14 w-14 rounded-full" />
              <Skeleton className="h-16 w-16 rounded-full" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

SwipeLoadingCard.displayName = 'SwipeLoadingCard';

// Keyframe for shimmer
const shimmerKeyframe = `
@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}
`;

// Inject keyframe if not already present
if (typeof document !== 'undefined') {
  const styleId = 'swipe-loading-shimmer';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = shimmerKeyframe;
    document.head.appendChild(style);
  }
}
