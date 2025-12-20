/**
 * Points Balance display component
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Coins, TrendingUp, Gift, ChevronRight } from 'lucide-react';
import { useUserPoints, getRedemptionTiers } from '@/hooks/useUserPoints';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface PointsBalanceProps {
  variant?: 'card' | 'compact' | 'inline';
  showProgress?: boolean;
  showCTA?: boolean;
  className?: string;
}

export function PointsBalance({ 
  variant = 'card', 
  showProgress = true,
  showCTA = true,
  className = '' 
}: PointsBalanceProps) {
  const { data, isLoading, error } = useUserPoints();
  const navigate = useNavigate();
  const tiers = getRedemptionTiers();

  if (error) {
    return null; // Silently fail - points shouldn't block UI
  }

  if (isLoading) {
    if (variant === 'inline') {
      return <Skeleton className="h-6 w-20" />;
    }
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  const balance = data?.balance ?? 0;
  const todayEarned = data?.today_earned ?? 0;
  const todayCap = data?.today_cap ?? 80;

  // Find next tier
  const nextTier = tiers.find(t => t.points > balance) || tiers[tiers.length - 1];
  const progressToNextTier = Math.min((balance / nextTier.points) * 100, 100);
  const pointsToNext = Math.max(nextTier.points - balance, 0);

  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <Coins className="h-4 w-4 text-yellow-500" />
        <span className="font-medium">{balance.toLocaleString()}</span>
        <span className="text-muted-foreground text-sm">pts</span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div 
        className={`flex items-center justify-between p-3 bg-card border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors ${className}`}
        onClick={() => navigate('/rewards')}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
            <Coins className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">{balance.toLocaleString()}</span>
              <span className="text-muted-foreground text-sm">points</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {pointsToNext > 0 
                ? `${pointsToNext} to ${nextTier.discount}% off` 
                : 'Ready to redeem!'}
            </p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Coins className="h-5 w-5 text-yellow-500" />
            Your Points
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {todayEarned}/{todayCap} today
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <span className="text-4xl font-bold">{balance.toLocaleString()}</span>
          <span className="text-muted-foreground ml-2">points</span>
        </div>

        {showProgress && pointsToNext > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress to {nextTier.discount}% off</span>
              <span className="font-medium">{pointsToNext} pts to go</span>
            </div>
            <Progress value={progressToNextTier} className="h-2" />
          </div>
        )}

        {showCTA && (
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => navigate('/rewards')}
          >
            <Gift className="h-4 w-4 mr-2" />
            View Rewards
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
