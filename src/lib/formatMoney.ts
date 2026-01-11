/**
 * Shared currency formatting utility
 * Uses Intl.NumberFormat for proper locale-aware formatting
 */

const LOCALE_MAP: Record<string, string> = {
  'AED': 'en-AE',
  'USD': 'en-US',
  'EUR': 'de-DE',
  'GBP': 'en-GB',
  'SAR': 'ar-SA',
  'QAR': 'ar-QA',
  'KWD': 'ar-KW',
  'BHD': 'ar-BH',
  'OMR': 'ar-OM'
};

/**
 * Format a monetary amount with the specified currency
 * @param amount - The numeric amount to format
 * @param currency - Currency code (e.g., 'AED', 'USD', 'SAR')
 * @returns Formatted currency string
 */
export const formatMoney = (amount: number, currency: string = 'AED'): string => {
  const locale = LOCALE_MAP[currency] || 'en-US';
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    // Fallback for unsupported currencies
    return `${currency} ${amount.toFixed(2)}`;
  }
};

/**
 * Format a price range with currency
 * @param min - Minimum price
 * @param max - Maximum price (optional)
 * @param currency - Currency code
 * @returns Formatted price range string
 */
export const formatPriceRange = (min: number, max?: number, currency: string = 'AED'): string => {
  if (!max || min === max) {
    return formatMoney(min, currency);
  }
  
  const locale = LOCALE_MAP[currency] || 'en-US';
  
  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    
    return `${formatter.format(min)} - ${formatter.format(max)}`;
  } catch {
    return `${currency} ${min} - ${max}`;
  }
};

/**
 * Get currency symbol from currency code
 * @param currency - Currency code
 * @returns Currency symbol
 */
export const getCurrencySymbol = (currency: string = 'AED'): string => {
  const symbols: Record<string, string> = {
    'AED': 'د.إ',
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'SAR': 'ر.س',
    'QAR': 'ر.ق',
    'KWD': 'د.ك',
    'BHD': 'د.ب',
    'OMR': 'ر.ع.'
  };
  
  return symbols[currency] || currency;
};
