/**
 * Centralized URL generation for all public share links.
 * 
 * RULES:
 * 1. If native (Capacitor) or capacitor:// protocol → always use env canonical
 * 2. Else if env var exists AND not on localhost/preview → use env var
 * 3. Else use window.location.origin (for dev/testing)
 */

// Canonical production domain - set via environment variable
const PRODUCTION_DOMAIN = import.meta.env.VITE_PUBLIC_WEB_URL || 'https://azyahstyle.com';

/**
 * Check if we're running on a native Capacitor platform.
 * Uses safe detection without direct import to avoid build issues on web-only envs.
 */
function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check protocol
  if (window.location.protocol === 'capacitor:') return true;
  
  // Check for Capacitor object on window
  const cap = (window as any).Capacitor;
  if (cap?.isNativePlatform?.()) return true;
  
  return false;
}

/**
 * Check if we're on localhost or a preview/staging environment.
 */
function isLocalOrPreview(): boolean {
  if (typeof window === 'undefined') return false;
  
  const origin = window.location.origin;
  return (
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    origin.includes('lovableproject.com') ||
    origin.includes('.lovable.app')
  );
}

/**
 * Get the public base URL for shareable links.
 * 
 * - On native platforms: always use production domain (links must work externally)
 * - On localhost/preview: use current origin (for testing)
 * - On production domain: use current origin
 */
export function getPublicBaseUrl(): string {
  // On native platforms, always use production URL (capacitor://localhost is useless for sharing)
  if (isNativePlatform()) {
    return PRODUCTION_DOMAIN;
  }
  
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    
    // If on localhost or preview, use current origin for easier testing
    if (isLocalOrPreview()) {
      return origin;
    }
    
    // On any production domain, use current origin
    return origin;
  }
  
  return PRODUCTION_DOMAIN;
}

// ============================================
// Centralized URL generators
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
 * @param productId - The product ID
 */
export function getProductShareUrl(productId: string): string {
  return `${getPublicBaseUrl()}/products/${productId}`;
}

// Legacy export for backward compatibility
export const SITE_URL = PRODUCTION_DOMAIN;
