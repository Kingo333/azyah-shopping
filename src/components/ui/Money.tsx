/**
 * Money display component - centralized price formatting
 * Uses shopper's preferred currency with automatic conversion
 * 
 * Usage:
 *   <Money cents={9900} currency="USD" />
 *   <Money cents={product.price_cents} currency={product.currency} showOriginal />
 */

import React from 'react';
import { useShopperCurrency } from '@/hooks/useShopperCurrency';
import { formatMoney } from '@/lib/formatMoney';
import { cn } from '@/lib/utils';

interface MoneyProps {
  /** Price in cents */
  cents: number;
  /** Currency code the price is stored in (e.g., 'USD', 'AED') */
  currency: string;
  /** Show original price in parentheses if converted */
  showOriginal?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Display formatted money with automatic currency conversion
 * Never shows wrong currency - if conversion fails, shows original currency
 */
export function Money({ 
  cents, 
  currency, 
  showOriginal = false, 
  className,
  size = 'md'
}: MoneyProps) {
  const { formatForShopper, isLoading } = useShopperCurrency();
  
  // Show placeholder while loading to avoid flash
  if (isLoading) {
    return (
      <span className={cn('inline-block animate-pulse bg-muted rounded', className)}>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
      </span>
    );
  }
  
  const formatted = formatForShopper(cents, currency, { showOriginal });
  
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg font-semibold'
  };
  
  return (
    <span className={cn(sizeClasses[size], className)}>
      {formatted}
    </span>
  );
}

/**
 * Static money formatting without shopper context
 * Use when you need to display a specific currency without conversion
 */
export function MoneyStatic({ 
  cents, 
  currency, 
  className,
  size = 'md'
}: Omit<MoneyProps, 'showOriginal'>) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg font-semibold'
  };
  
  return (
    <span className={cn(sizeClasses[size], className)}>
      {formatMoney(cents / 100, currency)}
    </span>
  );
}

export default Money;
