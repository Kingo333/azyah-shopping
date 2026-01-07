import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

/**
 * Centralized production site URL for all share links.
 * This ensures all shared URLs use the correct domain.
 */
export const SITE_URL = 'https://azyahstyle.com';

interface ShareOptions {
  title?: string;
  text?: string;
  url: string;
  dialogTitle?: string;
}

/**
 * Generate a share URL for outfits and wardrobe items using slug-only URLs.
 * Always uses the production domain (azyahstyle.com).
 * NO UUIDs in URLs - only human-readable slugs.
 */
export function getShareableUrl(
  type: 'outfit' | 'item',
  slug: string
): string {
  return `${SITE_URL}/share/${type}/${slug}`;
}

/**
 * Generate a share URL for products.
 * Products use /products/:id route, not /share/item/:id (which is for wardrobe items).
 */
export function getProductShareUrl(productId: string): string {
  return `${SITE_URL}/products/${productId}`;
}

/**
 * Cross-platform share utility that uses native sharing on iOS/Android
 * and falls back to Web Share API or clipboard on web.
 */
export async function nativeShare(options: ShareOptions): Promise<boolean> {
  try {
    // Check if running on native iOS/Android
    if (Capacitor.isNativePlatform()) {
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
