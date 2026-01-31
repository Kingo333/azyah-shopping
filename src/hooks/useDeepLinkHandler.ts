import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
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

/**
 * Safely decode a URL that may be encoded multiple times
 */
function safeDecodeUrl(encoded: string): string | null {
  try {
    let decoded = encoded;
    // Decode up to 3 times to handle multiple encoding
    for (let i = 0; i < 3; i++) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
    return isValidHttpUrl(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

/**
 * Deep link handler for Capacitor iOS/Android apps.
 * Handles:
 * - Cold start: App launched from URL while closed
 * - Warm start: URL opened while app is running
 * - Product URLs: Routes to Deals drawer with prefilled URL
 * - Auth callbacks: Routes to /auth/callback
 * - Style Links: Routes to /u/:username
 */
export const useDeepLinkHandler = () => {
  const navigate = useNavigate();
  const handledLaunchUrl = useRef(false);

  useEffect(() => {
    // Only set up listener on native platforms
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const handleAppUrlOpen = async (event: { url: string }) => {
      console.log('[DeepLink] URL received:', event.url);
      
      try {
        const url = new URL(event.url);
        
        // Check for shared product URL (e.g., azyah://open?url=https://...)
        const sharedProductUrl = url.searchParams.get('url') || 
                                  url.searchParams.get('productUrl') ||
                                  url.searchParams.get('product');
        
        if (sharedProductUrl) {
          const decodedUrl = safeDecodeUrl(sharedProductUrl);
          if (decodedUrl) {
            console.log('[DeepLink] Product URL detected, routing to Deals:', decodedUrl);
            navigate('/dashboard', { 
              replace: true, 
              state: { openDeals: true, productUrl: decodedUrl } 
            });
            return;
          }
        }
        
        // Extract the path from the URL
        // For com.azyah.style://auth/callback#..., pathname will be /auth/callback
        let path = url.pathname || '/';
        
        // Handle case where pathname might be empty for custom schemes
        if (!path || path === '/') {
          // Try to extract path from host (some URL parsers put it there for custom schemes)
          if (url.host && url.host.includes('/')) {
            path = '/' + url.host.split('/').slice(1).join('/');
          } else if (url.href.includes('://')) {
            // Extract path manually from URL
            const afterScheme = url.href.split('://')[1];
            if (afterScheme) {
              const pathPart = afterScheme.split('#')[0].split('?')[0];
              if (pathPart && pathPart !== url.host) {
                path = '/' + pathPart.replace(url.host, '').replace(/^\//, '');
              }
            }
          }
        }
        
        // Get hash fragment (contains Supabase tokens)
        const hash = url.hash || '';
        
        // Construct the full path with hash
        const fullPath = path + hash;
        
        console.log('[DeepLink] Navigating to:', fullPath);
        
        // Special handling for Style Link paths
        if (fullPath.startsWith('/u/') || fullPath.startsWith('u/')) {
          const normalizedPath = fullPath.startsWith('/') ? fullPath : `/${fullPath}`;
          navigate(normalizedPath, { replace: true });
          return;
        }
        
        // Navigate to the path (handles /auth/callback, /share/outfit/:id, /share/item/:id, etc.)
        navigate(fullPath, { replace: true });
      } catch (error) {
        console.error('[DeepLink] Error parsing URL:', error);
        // Fallback: navigate to home
        navigate('/', { replace: true });
      }
    };

    // COLD START: Check if app was launched with a URL
    if (!handledLaunchUrl.current) {
      App.getLaunchUrl().then((result) => {
        if (result?.url) {
          console.log('[DeepLink] Cold start with URL:', result.url);
          handledLaunchUrl.current = true;
          handleAppUrlOpen({ url: result.url });
        }
      }).catch((err) => {
        console.warn('[DeepLink] getLaunchUrl failed:', err);
      });
    }

    // WARM START: Listen for URL opens while app is running
    const listenerPromise = App.addListener('appUrlOpen', handleAppUrlOpen);

    // Cleanup on unmount
    return () => {
      listenerPromise.then(listener => listener.remove());
    };
  }, [navigate]);
};
