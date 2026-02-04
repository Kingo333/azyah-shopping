import { useEffect, useState, useCallback } from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface AnimatedProgressProps {
  isActive: boolean;
  duration?: number; // in seconds (e.g., 30 for image, 90 for video)
  label?: string;
  className?: string;
  initialProgress?: number; // For resuming progress on modal reopen
}

export function AnimatedProgress({
  isActive,
  duration = 30,
  label,
  className,
  initialProgress = 0
}: AnimatedProgressProps) {
  const [progress, setProgress] = useState(initialProgress);

  const resetProgress = useCallback(() => {
    setProgress(initialProgress);
  }, [initialProgress]);

  useEffect(() => {
    if (!isActive) {
      // Reset when inactive
      const timeout = setTimeout(resetProgress, 300);
      return () => clearTimeout(timeout);
    }

    // Calculate increment interval - update every 100ms
    const intervalMs = 100;
    const totalIntervals = (duration * 1000) / intervalMs;
    
    // Use easing - fast at start, slows down approaching 95%
    const targetProgress = 95;
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= targetProgress) return prev;
        
        // Easing: progress slows as it approaches target
        const remaining = targetProgress - prev;
        const baseIncrement = targetProgress / totalIntervals;
        
        // Slow down as we approach the target
        const easedIncrement = baseIncrement * (remaining / targetProgress) * 1.5;
        
        return Math.min(prev + Math.max(easedIncrement, 0.1), targetProgress);
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isActive, duration, resetProgress]);

  const estimatedTimeRemaining = Math.max(0, Math.ceil((duration * (100 - progress)) / 100));

  return (
    <div className={cn("w-full space-y-2", className)}>
      {label && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className="text-muted-foreground tabular-nums">
            {Math.round(progress)}%
          </span>
        </div>
      )}
      <Progress value={progress} className="h-2" />
      {isActive && (
        <p className="text-xs text-muted-foreground text-center">
          ~{estimatedTimeRemaining}s remaining
        </p>
      )}
    </div>
  );
}
