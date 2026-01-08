import { toast } from 'sonner';

// Re-export URL helpers from centralized module
export { 
  SITE_URL,
  getPublicBaseUrl,
  getStyleLinkUrl,
  getOutfitShareUrl,
  getItemShareUrl,
  getProductShareUrl,
  getDealsUrl 
} from './urls';

import { getOutfitShareUrl, getItemShareUrl } from './urls';

interface ShareOptions {
  title?: string;
  text?: string;
  url: string;
  dialogTitle?: string;
}

/**
 * Generate a share URL for outfits and wardrobe items using slug-only URLs.
 * Uses the centralized URL helpers.
 * NO UUIDs in URLs - only human-readable slugs.
 */
export function getShareableUrl(
  type: 'outfit' | 'item',
  slug: string
): string {
  return type === 'outfit' ? getOutfitShareUrl(slug) : getItemShareUrl(slug);
}

/**
 * Cross-platform share utility that uses native sharing on iOS/Android
 * and falls back to Web Share API or clipboard on web.
 */
/**
 * Check if we're on a native Capacitor platform (safe detection).
 */
function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.location.protocol === 'capacitor:') return true;
  const cap = (window as any).Capacitor;
  return cap?.isNativePlatform?.() === true;
}

/**
 * Cross-platform share utility that uses native sharing on iOS/Android
 * and falls back to Web Share API or clipboard on web.
 */
export async function nativeShare(options: ShareOptions): Promise<boolean> {
  try {
    // Check if running on native iOS/Android
    if (isNativePlatform()) {
      const { Share } = await import('@capacitor/share');
      await Share.share({
        title: options.title,
        text: options.text,
        url: options.url,
        dialogTitle: options.dialogTitle || 'Share via Azyah Style',
      });
      return true;
    }
    
    // Fallback to Web Share API
    if (navigator.share) {
      await navigator.share({
        title: options.title,
        text: options.text,
        url: options.url,
      });
      return true;
    }
    
    // Final fallback: copy to clipboard
    await navigator.clipboard.writeText(options.url);
    toast.success('Link copied to clipboard');
    return true;
  } catch (error: any) {
    // User cancelled sharing - not an error
    if (error?.name === 'AbortError' || error?.message?.includes('cancel')) {
      return false;
    }
    
    // Try clipboard as last resort
    try {
      await navigator.clipboard.writeText(options.url);
      toast.success('Link copied to clipboard');
      return true;
    } catch {
      toast.error('Unable to share');
      return false;
    }
  }
}
