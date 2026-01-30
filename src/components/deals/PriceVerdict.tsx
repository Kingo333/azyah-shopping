import React from 'react';
import { cn } from '@/lib/utils';

interface PriceVerdictProps {
  low: number | null;
  median: number | null;
  high: number | null;
  validCount: number;
  currency?: string;
  className?: string;
}

export function PriceVerdict({ 
  low, 
  median, 
  high, 
  validCount, 
  currency = 'AED',
  className 
}: PriceVerdictProps) {
  // Guardrail: Don't show verdict if insufficient data
  if (validCount < 5 || low === null || median === null || high === null) {
    return (
      <div className={cn(
        "text-center py-3 px-4 rounded-2xl",
        "bg-white/40 dark:bg-white/10",
        "backdrop-blur-sm",
        "border border-white/20",
        className
      )}>
        <p className="text-xs text-muted-foreground">
          {validCount > 0 
            ? `Found ${validCount} prices — need 5+ to show typical range`
            : 'Collecting price data...'
          }
        </p>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className={cn(
      "p-4 rounded-2xl",
      "bg-white/50 dark:bg-white/10",
      "backdrop-blur-xl",
      "border border-white/20",
      "shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]",
      className
    )}>
      <div className="space-y-3">
        {/* Price labels as pill badges */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400">
            Low
          </span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/70 dark:bg-white/20 text-muted-foreground">
            Typical
          </span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 dark:text-red-400">
            High
          </span>
        </div>
        
        {/* Thin price bar - semantic colors preserved */}
        <div className="relative h-1 bg-gradient-to-r from-green-500 via-yellow-400 to-red-500 rounded-full">
          {/* Glowing median marker - neutral white glow */}
          <div 
            className="
              absolute top-1/2 -translate-y-1/2 
              w-2 h-2 rounded-full 
              bg-white 
              shadow-[0_0_8px_rgba(255,255,255,0.9),0_0_4px_rgba(0,0,0,0.2)]
              ring-2 ring-white/70
            "
            style={{ left: '50%', transform: 'translate(-50%, -50%)' }}
          />
        </div>
        
        {/* Price values */}
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-green-600 dark:text-green-400">{formatPrice(low)}</span>
          <span className="text-foreground">{formatPrice(median)}</span>
          <span className="text-red-500 dark:text-red-400">{formatPrice(high)}</span>
        </div>
      </div>
    </div>
  );
}

export default PriceVerdict;
