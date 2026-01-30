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
      <div className={cn("text-center py-3 px-4 bg-muted/50 rounded-lg", className)}>
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
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-green-600 font-medium">Low</span>
        <span className="text-muted-foreground">Typical</span>
        <span className="text-red-500 font-medium">High</span>
      </div>
      
      {/* Price bar */}
      <div className="relative h-2 bg-gradient-to-r from-green-500 via-amber-400 to-red-500 rounded-full">
        {/* Median marker */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-foreground rounded-full shadow-sm"
          style={{ left: '50%', transform: 'translate(-50%, -50%)' }}
        />
      </div>
      
      {/* Price labels */}
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="text-green-600">{formatPrice(low)}</span>
        <span className="text-foreground">{formatPrice(median)}</span>
        <span className="text-red-500">{formatPrice(high)}</span>
      </div>
    </div>
  );
}

export default PriceVerdict;
