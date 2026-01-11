/**
 * Centralized country → currency mapping using ISO codes
 * Country codes: ISO 3166-1 alpha-2 (e.g., AE, US, GB)
 * Currency codes: ISO 4217 (e.g., AED, USD, GBP)
 */

import { COUNTRIES } from '@/lib/countries';

// Country code → Currency code mapping
export const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  // Middle East
  'AE': 'AED', // United Arab Emirates
  'SA': 'SAR', // Saudi Arabia
  'QA': 'QAR', // Qatar
  'KW': 'KWD', // Kuwait
  'BH': 'BHD', // Bahrain
  'OM': 'OMR', // Oman
  'JO': 'USD', // Jordan (uses JOD but USD common)
  'LB': 'USD', // Lebanon
  

  // Americas
  'US': 'USD', // United States
  'CA': 'USD', // Canada (CAD but USD common)
  'MX': 'USD', // Mexico
  
  // Europe
  'GB': 'GBP', // United Kingdom
  'DE': 'EUR', // Germany
  'FR': 'EUR', // France
  'IT': 'EUR', // Italy
  'ES': 'EUR', // Spain
  'NL': 'EUR', // Netherlands
  'BE': 'EUR', // Belgium
  'AT': 'EUR', // Austria
  'IE': 'EUR', // Ireland
  'PT': 'EUR', // Portugal
  'GR': 'EUR', // Greece
  'FI': 'EUR', // Finland
  'LU': 'EUR', // Luxembourg
  'MT': 'EUR', // Malta
  'CY': 'EUR', // Cyprus
  'SK': 'EUR', // Slovakia
  'SI': 'EUR', // Slovenia
  'EE': 'EUR', // Estonia
  'LV': 'EUR', // Latvia
  'LT': 'EUR', // Lithuania
  'CH': 'EUR', // Switzerland (CHF but EUR common)
  'SE': 'EUR', // Sweden (SEK but EUR common)
  'NO': 'EUR', // Norway (NOK but EUR common)
  'DK': 'EUR', // Denmark (DKK but EUR common)
  
  // Asia Pacific
  'IN': 'USD', // India (INR but USD common for e-commerce)
  'PK': 'USD', // Pakistan
  'SG': 'USD', // Singapore (SGD but USD common)
  'HK': 'USD', // Hong Kong
  'JP': 'USD', // Japan (JPY but USD common)
  'KR': 'USD', // South Korea
  'AU': 'USD', // Australia (AUD but USD common)
  'NZ': 'USD', // New Zealand
  
  // Africa
  'ZA': 'USD', // South Africa
  'NG': 'USD', // Nigeria
  'KE': 'USD', // Kenya
  'EG': 'USD', // Egypt
  'MA': 'USD', // Morocco
};

// Default currency when no mapping exists
export const DEFAULT_CURRENCY = 'AED';

/**
 * Get the currency code for a country code
 * @param countryCode - ISO 3166-1 alpha-2 country code (e.g., 'AE', 'US')
 * @returns ISO 4217 currency code (e.g., 'AED', 'USD')
 */
export function getCurrencyForCountry(countryCode: string | null | undefined): string {
  if (!countryCode) return DEFAULT_CURRENCY;
  const normalized = countryCode.toUpperCase().trim();
  return COUNTRY_CURRENCY_MAP[normalized] || DEFAULT_CURRENCY;
}

/**
 * Get country name from country code
 * @param code - ISO 3166-1 alpha-2 country code
 * @returns Country display name or the code itself if not found
 */
export function getCountryNameFromCode(code: string | null | undefined): string {
  if (!code) return '';
  const country = COUNTRIES.find(c => c.code === code.toUpperCase());
  return country?.name || code;
}

/**
 * Get country code from country name (for backwards compatibility)
 * @param name - Country display name
 * @returns ISO 3166-1 alpha-2 country code or null
 */
export function getCountryCodeFromName(name: string | null | undefined): string | null {
  if (!name) return null;
  const country = COUNTRIES.find(c => c.name.toLowerCase() === name.toLowerCase());
  return country?.code || null;
}

/**
 * Check if a region code represents worldwide shipping/service
 */
export const WORLDWIDE_CODE = 'WORLDWIDE';

export function isWorldwide(regions: string[] | null | undefined): boolean {
  if (!regions || regions.length === 0) return false;
  return regions.includes(WORLDWIDE_CODE);
}
