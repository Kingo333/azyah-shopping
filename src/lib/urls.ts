/**
 * Centralized URL generation for all public share links.
 * 
 * RULES (Canonical Domain Always):
 * 1. If VITE_PUBLIC_WEB_URL is set → ALWAYS use it for share links
 * 2. If VITE_SHARE_USE_RUNTIME_ORIGIN=true AND on localhost → use runtime origin (dev only)
 * 3. Default fallback is azyahstyle.com
 * 
 * Share links ALWAYS use the canonical production domain, even on preview/localhost.
 * This ensures QR codes, copy links, and shares work correctly everywhere.
 */

// Canonical production domain - set via environment variable
const PRODUCTION_DOMAIN = import.meta.env.VITE_PUBLIC_WEB_URL || 'https://azyahstyle.com';

// Optional dev flag to allow runtime origin for local testing only
const USE_RUNTIME_ORIGIN = import.meta.env.VITE_SHARE_USE_RUNTIME_ORIGIN === 'true';

/**
 * Check if we're on localhost (for dev override only).
 */
function isLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  const origin = window.location.origin;
  return origin.includes('localhost') || origin.includes('127.0.0.1');
}

/**
 * Get the public base URL for shareable links.
 * 
 * ALWAYS returns the canonical production domain for share links,
 * except when explicitly overridden with VITE_SHARE_USE_RUNTIME_ORIGIN=true on localhost.
 */
export function getPublicBaseUrl(): string {
  // Dev override: only if explicitly enabled AND on localhost
  if (USE_RUNTIME_ORIGIN && isLocalhost() && typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // ALWAYS return canonical production domain for share links
  return PRODUCTION_DOMAIN;
}

// ============================================
// Centralized URL generators for share links
// ============================================

/**
 * Generate the Style Link URL for a user profile.
 * @param username - The user's handle (NOT UUID)
 * @param referralCode - Optional referral code to append
 */
export function getStyleLinkUrl(username: string, referralCode?: string | null): string {
  const base = getPublicBaseUrl();
  const url = `${base}/u/${username}`;
  return referralCode ? `${url}?ref=${referralCode}` : url;
}

/**
 * Generate the public outfit share URL.
 * @param slug - The outfit's share_slug
 */
export function getOutfitShareUrl(slug: string): string {
  return `${getPublicBaseUrl()}/share/outfit/${slug}`;
}

/**
 * Generate the public wardrobe item share URL.
 * @param slug - The item's share_slug
 */
export function getItemShareUrl(slug: string): string {
  return `${getPublicBaseUrl()}/share/item/${slug}`;
}

/**
 * Generate the public deals page URL for a user.
 * @param username - The user's handle
 */
export function getDealsUrl(username: string): string {
  return `${getPublicBaseUrl()}/u/${username}/deals`;
}

/**
 * Generate the product detail page URL.
 * NOTE: /products/:id route does NOT exist yet. Use only for internal reference.
 * @param productId - The product ID
 */
export function getProductShareUrl(productId: string): string {
  return `${getPublicBaseUrl()}/products/${productId}`;
}

/**
 * Generate a brand page URL.
 * @param slug - The brand's slug
 */
export function getBrandUrl(slug: string): string {
  return `${getPublicBaseUrl()}/brand/${slug}`;
}

// Legacy export for backward compatibility
export const SITE_URL = PRODUCTION_DOMAIN;
