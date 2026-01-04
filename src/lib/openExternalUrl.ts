import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

/**
 * Opens an external URL using Safari View Controller on iOS,
 * Chrome Custom Tabs on Android, or a new browser tab on web.
 * 
 * @param url - The URL to open (can be null/undefined)
 * @returns Promise<boolean> - true if URL was opened successfully
 */
export async function openExternalUrl(url: string | null | undefined): Promise<boolean> {
  // Validate URL exists
  if (!url || typeof url !== 'string' || url.trim() === '') {
    toast.error('No shopping link available');
    return false;
  }

  // Normalize URL - ensure it has a protocol
  let normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    console.warn('URL missing protocol, normalizing to https://', url);
    normalizedUrl = `https://${normalizedUrl}`;
  }

  try {
    if (Capacitor.isNativePlatform()) {
      // Use Safari View Controller on iOS / Chrome Custom Tabs on Android
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url: normalizedUrl });
    } else {
      // Web: open in new tab
      window.open(normalizedUrl, '_blank', 'noopener,noreferrer');
    }
    return true;
  } catch (error) {
    console.error('Failed to open external URL:', error);
    toast.error('Failed to open link');
    return false;
  }
}
