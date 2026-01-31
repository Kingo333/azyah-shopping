import { useEffect, useState, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Clipboard } from '@capacitor/clipboard';
import { App } from '@capacitor/app';

/**
 * Validates if a string is a valid HTTP/HTTPS URL
 */
function isValidHttpUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

interface ClipboardLinkResult {
  detectedUrl: string | null;
  clearDetectedUrl: () => void;
  checkClipboard: () => Promise<void>;
}

/**
 * Hook that detects HTTP/HTTPS URLs in the clipboard on app resume.
 * Only prompts user once per URL (doesn't re-prompt for the same URL).
 * 
 * Usage:
 * const { detectedUrl, clearDetectedUrl } = useClipboardLinkDetector();
 * 
 * if (detectedUrl) {
 *   // Show prompt: "Open this link in Deals?"
 *   // On accept: use detectedUrl, then clearDetectedUrl()
 *   // On dismiss: clearDetectedUrl()
 * }
 */
export function useClipboardLinkDetector(): ClipboardLinkResult {
  const [detectedUrl, setDetectedUrl] = useState<string | null>(null);
  const lastCheckedUrl = useRef<string | null>(null);
  const hasCheckedOnMount = useRef(false);

  const checkClipboard = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const result = await Clipboard.read();
      const content = result.value?.trim();
      
      if (!content) return;
      
      // Skip if we've already prompted for this URL
      if (content === lastCheckedUrl.current) return;
      
      // Check if it's a valid HTTP/HTTPS URL
      if (isValidHttpUrl(content)) {
        console.log('[ClipboardDetector] Found URL in clipboard:', content.slice(0, 50) + '...');
        lastCheckedUrl.current = content;
        setDetectedUrl(content);
      }
    } catch (err) {
      // Clipboard access may be denied - that's okay
      console.warn('[ClipboardDetector] Could not read clipboard:', err);
    }
  }, []);

  const clearDetectedUrl = useCallback(() => {
    setDetectedUrl(null);
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Check on initial mount (cold start)
    if (!hasCheckedOnMount.current) {
      hasCheckedOnMount.current = true;
      // Small delay to let app fully initialize
      const timeout = setTimeout(checkClipboard, 500);
      return () => clearTimeout(timeout);
    }
  }, [checkClipboard]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Check on app resume (warm start)
    const listenerPromise = App.addListener('appStateChange', (state) => {
      if (state.isActive) {
        console.log('[ClipboardDetector] App resumed, checking clipboard...');
        checkClipboard();
      }
    });

    return () => {
      listenerPromise.then(listener => listener.remove());
    };
  }, [checkClipboard]);

  return { detectedUrl, clearDetectedUrl, checkClipboard };
}
