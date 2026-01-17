/**
 * Daily Check-in button component
 * Awards +10 points once per day
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Check, Loader2 } from 'lucide-react';
import { useAwardPoints } from '@/hooks/useAwardPoints';
import { useDailyCheckinStatus } from '@/hooks/useUserPoints';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

interface DailyCheckinProps {
  variant?: 'card' | 'button';
  className?: string;
}

export function DailyCheckin({ variant = 'card', className = '' }: DailyCheckinProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: checkedInToday, isLoading: statusLoading } = useDailyCheckinStatus();
  const awardPoints = useAwardPoints();

  const handleCheckin = async () => {
    if (!user || checkedInToday || awardPoints.isPending) return;

    // Generate idempotency key: daily_checkin:<user_id>:<YYYY-MM-DD>
    const today = new Date().toISOString().split('T')[0];
    const idempotencyKey = `daily_checkin:${user.id}:${today}`;

    await awardPoints.mutateAsync({
      actionType: 'daily_checkin',
      idempotencyKey,
      showToast: true
    });

    // Invalidate the check-in status
    queryClient.invalidateQueries({ queryKey: ['daily-checkin-status'] });
  };

  if (!user) return null;

  const isDisabled = checkedInToday || awardPoints.isPending || statusLoading;

  if (variant === 'button') {
    return (
      <Button
        onClick={handleCheckin}
        disabled={isDisabled}
        variant={checkedInToday ? 'secondary' : 'default'}
        className={className}
      >
        {awardPoints.isPending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : checkedInToday ? (
          <Check className="h-4 w-4 mr-2" />
        ) : (
          <Sparkles className="h-4 w-4 mr-2" />
        )}
        {checkedInToday ? 'Checked In' : 'Check In (+10 pts)'}
      </Button>
    );
  }

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              checkedInToday 
                ? 'bg-green-100 dark:bg-green-900/30' 
                : 'bg-[hsl(var(--azyah-maroon))]/10'
            }`}>
              {checkedInToday ? (
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <Sparkles className="h-5 w-5 text-[hsl(var(--azyah-maroon))]" />
              )}
            </div>
            <div>
              <h3 className="font-medium text-sm">Training Streak</h3>
              <p className="text-xs text-muted-foreground">
                {checkedInToday ? 'Come back tomorrow!' : '+10 points • helps calibrate your model'}
              </p>
            </div>
          </div>
          <Button
            onClick={handleCheckin}
            disabled={isDisabled}
            size="sm"
            variant={checkedInToday ? 'secondary' : 'default'}
            className={checkedInToday ? '' : 'bg-[hsl(var(--azyah-maroon))] hover:bg-[hsl(var(--azyah-maroon))]/90'}
          >
            {awardPoints.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : checkedInToday ? (
              'Done ✓'
            ) : (
              'Check In'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
