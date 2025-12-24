import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, ChevronRight, Sparkles } from 'lucide-react';
import { useUserPoints, getRedemptionTiers } from '@/hooks/useUserPoints';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

export function PointsSummaryCard() {
  const navigate = useNavigate();
  const { data: pointsData, isLoading, error } = useUserPoints();

  const handleClick = () => {
    navigate('/rewards');
  };

  // Calculate progress to next tier
  const tiers = getRedemptionTiers();
  const balance = pointsData?.balance ?? 0;
  const currentTier = tiers.find(t => balance < t.points) || tiers[tiers.length - 1];
  const previousTierPoints = tiers.find((t, i) => i > 0 && tiers[i - 1].points <= balance && balance < t.points)
    ? tiers[tiers.findIndex(t => balance < t.points) - 1]?.points || 0
    : 0;
  const progressToNext = currentTier 
    ? Math.min(100, ((balance - previousTierPoints) / (currentTier.points - previousTierPoints)) * 100)
    : 100;
  const pointsToGo = currentTier ? Math.max(0, currentTier.points - balance) : 0;

  if (error) {
    return null; // Hide card on error
  }

  return (
    <div className="h-full flex items-center">
      <button
        onClick={handleClick}
        className="w-full p-4 bg-card rounded-xl border border-border shadow-sm text-left hover:bg-accent/50 transition-colors"
        aria-label="View your rewards"
      >
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-2 w-full" />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Header with points */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[hsl(var(--azyah-maroon))]/10 flex items-center justify-center">
                  <Gift className="h-4 w-4 text-[hsl(var(--azyah-maroon))]" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-semibold text-foreground">
                      {balance.toLocaleString()}
                    </span>
                    <span className="text-sm text-muted-foreground">pts</span>
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>

            {/* Progress info */}
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                <span>
                  {pointsToGo > 0 
                    ? `${pointsToGo} pts to ${currentTier.discount}% off`
                    : 'Max tier reached!'
                  }
                </span>
              </div>
              <Progress 
                value={progressToNext} 
                className="h-1.5 bg-muted [&>div]:bg-[hsl(var(--azyah-maroon))]"
              />
            </div>
          </div>
        )}
      </button>
    </div>
  );
}
