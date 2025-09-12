import React from 'react';
import { Clock, Crown } from 'lucide-react';
import { useVoiceUsage } from '@/hooks/useVoiceUsage';

export function VoiceUsageDisplay() {
  const { usage, loading } = useVoiceUsage();

  if (loading || !usage) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock size={16} />
        <span>Loading...</span>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes === 0) {
      return `${remainingSeconds}s`;
    }
    
    return remainingSeconds === 0 ? `${minutes}m` : `${minutes}m ${remainingSeconds}s`;
  };

  const percentageUsed = (usage.used_today / usage.daily_limit) * 100;

  return (
    <div className="flex items-center gap-3 p-3 bg-card rounded-lg border">
      {usage.is_premium && (
        <Crown size={16} className="text-primary" />
      )}
      <div className="flex-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Voice time today</span>
          <span className="font-medium">
            {formatTime(usage.remaining_seconds)} remaining
          </span>
        </div>
        <div className="mt-1 w-full bg-muted rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all ${
              percentageUsed > 90 ? 'bg-destructive' : 
              percentageUsed > 70 ? 'bg-warning' : 'bg-primary'
            }`}
            style={{ width: `${Math.min(percentageUsed, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{formatTime(usage.used_today)} used</span>
          <span>{formatTime(usage.daily_limit)} total ({usage.is_premium ? 'premium' : 'free'})</span>
        </div>
      </div>
    </div>
  );
}