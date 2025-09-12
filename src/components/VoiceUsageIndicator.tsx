import React from 'react';
import { Clock, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVoiceUsage } from '@/hooks/useVoiceUsage';
import { useSubscription } from '@/hooks/useSubscription';

interface VoiceUsageIndicatorProps {
  onUpgrade?: () => void;
}

export function VoiceUsageIndicator({ onUpgrade }: VoiceUsageIndicatorProps) {
  const { usage, getLimitWarning } = useVoiceUsage();
  const { isPremium } = useSubscription();
  
  const warning = getLimitWarning();
  
  if (!usage || !warning) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isAtLimit = usage.remaining_seconds <= 0;
  const isLowTime = usage.remaining_seconds <= 60;

  return (
    <div className={`
      fixed bottom-20 left-1/2 -translate-x-1/2 z-40
      bg-background/95 backdrop-blur-sm border rounded-lg px-4 py-3
      flex items-center gap-3 shadow-lg max-w-[90vw]
      ${isAtLimit ? 'border-destructive' : isLowTime ? 'border-warning' : 'border-border'}
    `}>
      <Clock size={16} className={`
        ${isAtLimit ? 'text-destructive' : isLowTime ? 'text-warning' : 'text-muted-foreground'}
      `} />
      
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${
          isAtLimit ? 'text-destructive' : 'text-foreground'
        }`}>
          {warning}
        </p>
        
        {usage.remaining_seconds > 0 && (
          <p className="text-xs text-muted-foreground">
            {formatTime(usage.remaining_seconds)} / {formatTime(usage.daily_limit)} left today
          </p>
        )}
      </div>

      {!isPremium && onUpgrade && (
        <Button
          size="sm"
          onClick={onUpgrade}
          className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70"
        >
          <Crown size={14} className="mr-1" />
          Upgrade
        </Button>
      )}
    </div>
  );
}