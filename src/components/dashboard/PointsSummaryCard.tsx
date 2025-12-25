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
        className="w-full p-3 bg-gradient-to-br from-primary/5 via-card to-accent/5 rounded-xl border border-border/50 shadow-sm text-left hover:from-primary/10 hover:to-accent/10 transition-all duration-200"
        aria-label="View your rewards"
      >
        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-1.5 w-full" />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Header with points */}
              <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <Gift className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      {balance.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">pts</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground">Tap to view rewards</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {/* Progress info */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Sparkles className="h-2.5 w-2.5 text-accent" />
                <span>
                  {pointsToGo > 0 
                    ? `${pointsToGo} pts to ${currentTier.discount}% off`
                    : 'Max tier reached!'
                  }
                </span>
              </div>
              <Progress 
                value={progressToNext} 
                className="h-1.5 bg-background/60 [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-accent"
              />
            </div>
          </div>
        )}
      </button>
    </div>
  );
}
