/**
 * Centralized hook for shopper currency display and conversion
 * 
 * Key behaviors:
 * 1. Uses shopper's preferred_currency if set
 * 2. Falls back to currency derived from shopper's country
 * 3. Converts prices using fx_rates table
 * 4. Never formats unconverted amounts in wrong currency (critical!)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrencyForCountry, getCountryCodeFromName, DEFAULT_CURRENCY } from '@/lib/countryCurrency';
import { formatMoney } from '@/lib/formatMoney';

interface FxRate {
  base_currency: string;
  quote_currency: string;
  rate: number | string; // Supabase may return numeric as string or number
}

interface ShopperProfile {
  preferred_currency: string | null;
  country: string | null;
}

interface ConversionResult {
  convertedCents: number;
  currency: string;
  wasConverted: boolean;
}

export function useShopperCurrency() {
  const { user } = useAuth();
  
  // Get user's preferred currency and country
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['shopper-currency-profile', user?.id],
    queryFn: async (): Promise<ShopperProfile | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('users')
        .select('preferred_currency, country')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('[useShopperCurrency] Profile fetch error:', error);
        return null;
      }
      return data as ShopperProfile;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000 // 30 minutes
  });
  
  // Get exchange rates (cached heavily)
  const { data: fxRates, isLoading: ratesLoading } = useQuery({
    queryKey: ['fx-rates'],
    queryFn: async (): Promise<FxRate[]> => {
      const { data, error } = await supabase
        .from('fx_rates')
        .select('base_currency, quote_currency, rate');
      
      if (error) {
        console.error('[useShopperCurrency] FX rates fetch error:', error);
        return [];
      }
      return (data || []) as FxRate[];
    },
    staleTime: 60 * 60 * 1000, // 1 hour cache
    gcTime: 24 * 60 * 60 * 1000 // 24 hours
  });
  
  // Determine shopper's display currency
  const getShopperCurrency = (): string => {
    // Priority 1: Explicit preference
    if (profile?.preferred_currency) {
      return profile.preferred_currency;
    }
    
    // Priority 2: Derive from country
    if (profile?.country) {
      // Handle both country names and country codes
      const countryCode = profile.country.length === 2 
        ? profile.country 
        : getCountryCodeFromName(profile.country);
      
      if (countryCode) {
        return getCurrencyForCountry(countryCode);
      }
    }
    
    // Priority 3: Default
    return DEFAULT_CURRENCY;
  };
  
  const shopperCurrency = getShopperCurrency();
  
  /**
   * Find exchange rate between two currencies
   * @returns rate as number or null if not available
   */
  const findRate = (from: string, to: string): number | null => {
    if (!fxRates || fxRates.length === 0) return null;
    if (from === to) return 1;
    
    // Try direct rate
    const direct = fxRates.find(
      r => r.base_currency === from && r.quote_currency === to
    );
    if (direct) {
      // Handle both string and number (Supabase returns numeric as either depending on config)
      const rate = typeof direct.rate === 'string' ? parseFloat(direct.rate) : direct.rate;
      return isNaN(rate) ? null : rate;
    }
    
    // Try via USD as intermediate
    const toUsd = fxRates.find(r => r.base_currency === from && r.quote_currency === 'USD');
    const fromUsd = fxRates.find(r => r.base_currency === 'USD' && r.quote_currency === to);
    
    if (toUsd && fromUsd) {
      const rate1 = typeof toUsd.rate === 'string' ? parseFloat(toUsd.rate) : toUsd.rate;
      const rate2 = typeof fromUsd.rate === 'string' ? parseFloat(fromUsd.rate) : fromUsd.rate;
      if (!isNaN(rate1) && !isNaN(rate2)) {
        return rate1 * rate2;
      }
    }
    
    return null;
  };
  
  /**
   * Convert price from product currency to shopper currency
   * Returns conversion result including whether conversion was successful
   */
  const convertPrice = (amountCents: number, fromCurrency: string): ConversionResult => {
    // Same currency - no conversion needed
    if (fromCurrency === shopperCurrency) {
      return { 
        convertedCents: amountCents, 
        currency: shopperCurrency, 
        wasConverted: false 
      };
    }
    
    // Find rate
    const rate = findRate(fromCurrency, shopperCurrency);
    
    if (rate !== null) {
      return {
        convertedCents: Math.round(amountCents * rate),
        currency: shopperCurrency,
        wasConverted: true
      };
    }
    
    // Conversion not available - return ORIGINAL currency to avoid showing wrong currency
    return {
      convertedCents: amountCents,
      currency: fromCurrency,
      wasConverted: false
    };
  };
  
  /**
   * Format price for display in shopper's currency
   * If conversion unavailable, shows original currency (never shows wrong currency!)
   * 
   * @param amountCents - Price in cents
   * @param productCurrency - The currency the product is stored in
   * @param options.showOriginal - If true, shows original price in parentheses when converted
   */
  const formatForShopper = (
    amountCents: number, 
    productCurrency: string,
    options?: { showOriginal?: boolean }
  ): string => {
    const result = convertPrice(amountCents, productCurrency);
    const formatted = formatMoney(result.convertedCents / 100, result.currency);
    
    // Show original price in parentheses if requested and conversion happened
    if (options?.showOriginal && result.wasConverted && productCurrency !== result.currency) {
      const original = formatMoney(amountCents / 100, productCurrency);
      return `${formatted} (${original})`;
    }
    
    return formatted;
  };
  
  /**
   * Check if conversion is available for a specific currency
   */
  const canConvert = (fromCurrency: string): boolean => {
    if (fromCurrency === shopperCurrency) return true;
    return findRate(fromCurrency, shopperCurrency) !== null;
  };
  
  return {
    /** The shopper's preferred display currency */
    shopperCurrency,
    
    /** The shopper's country (may be name or code depending on how stored) */
    shopperCountry: profile?.country || null,
    
    /** Convert price from product currency to shopper currency */
    convertPrice,
    
    /** Format price for display - handles conversion and formatting */
    formatForShopper,
    
    /** Check if a currency can be converted to shopper currency */
    canConvert,
    
    /** Loading state */
    isLoading: profileLoading || ratesLoading,
    
    /** Whether user has set an explicit currency preference */
    hasExplicitPreference: !!profile?.preferred_currency
  };
}
