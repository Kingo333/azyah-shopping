import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

interface ShareOptions {
  title?: string;
  text?: string;
  url: string;
  dialogTitle?: string;
}

/**
 * Generate a share URL that works with link previews.
 * Points to the edge function which returns proper OG meta tags for bots,
 * then redirects browsers to the actual SPA route.
 */
export function getShareableUrl(type: 'outfit' | 'item', id: string): string {
  return `https://klwolsopucgswhtdlsps.supabase.co/functions/v1/share-meta?type=${type}&id=${id}`;
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
