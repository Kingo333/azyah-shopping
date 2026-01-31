import React, { useState, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import { InAppBrowser, ToolBarType } from '@capgo/inappbrowser';
import { Button } from '@/components/ui/button';
import { Loader2, Globe, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EXTRACTION_SCRIPT, parseExtractionResult } from '@/lib/webview-extractor';
import type { ProductContext } from '@/types/ProductContext';

interface OpenInAzyahButtonProps {
  url: string;
  onContextExtracted?: (context: ProductContext) => void;
  onExtractionFailed?: (error: string) => void;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

/**
 * "Open in Azyah" button that launches a real WebView
 * for Phia-style in-session product extraction using @capgo/inappbrowser.
 * 
 * Flow:
 * 1. Register listeners BEFORE opening WebView
 * 2. Open WebView with product URL
 * 3. On page load, inject extraction script (once)
 * 4. Script extracts JSON-LD/OG/DOM and posts result via window.mobileApp
 * 5. Parse result, call onContextExtracted, close WebView
 * 6. Cleanup all listeners on close/timeout/completion
 */
export function OpenInAzyahButton({
  url,
  onContextExtracted,
  onExtractionFailed,
  className,
  variant = 'outline',
  size = 'sm',
}: OpenInAzyahButtonProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'failed'>('idle');
  
  // Refs for cleanup and guards
  const listenersRef = useRef<PluginListenerHandle[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const injectedRef = useRef(false);
  const completedRef = useRef(false);

  /**
   * Clean up all listeners and timeout
   */
  const cleanup = useCallback(async () => {
    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Remove all listeners using individual handles
    for (const listener of listenersRef.current) {
      try {
        await listener.remove();
      } catch (e) {
        console.warn('[OpenInAzyah] Failed to remove listener:', e);
      }
    }
    listenersRef.current = [];
    
    // Reset guards
    injectedRef.current = false;
    completedRef.current = false;
  }, []);

  /**
   * Close WebView and cleanup
   */
  const closeAndCleanup = useCallback(async () => {
    try {
      await InAppBrowser.close();
    } catch (e) {
      console.warn('[OpenInAzyah] Failed to close browser:', e);
    }
    await cleanup();
    setIsExtracting(false);
  }, [cleanup]);

  /**
   * Build the injection wrapper that executes EXTRACTION_SCRIPT
   * and posts the result via window.mobileApp.postMessage
   * 
   * The wrapper pattern is robust - it executes the IIFE as-is
   * and captures its return value, avoiding fragile string replacements.
   */
  const buildInjectionScript = useCallback(() => {
    return `
      (function() {
        try {
          // Execute the extraction script (IIFE that returns result object)
          const res = ${EXTRACTION_SCRIPT};
          
          // Post result back to native via mobileApp bridge
          if (window.mobileApp && typeof window.mobileApp.postMessage === 'function') {
            window.mobileApp.postMessage({
              detail: { type: 'extraction_result', data: res }
            });
          } else {
            console.error('[AzyahExtractor] window.mobileApp.postMessage not available');
          }
        } catch (e) {
          // Post error back to native
          if (window.mobileApp && typeof window.mobileApp.postMessage === 'function') {
            window.mobileApp.postMessage({
              detail: { 
                type: 'extraction_result', 
                data: { success: false, error: String(e && e.message ? e.message : e) } 
              }
            });
          }
        }
      })();
    `;
  }, []);

  const handleOpenInAzyah = async () => {
    // Web fallback: just open URL in new tab
    if (!Capacitor.isNativePlatform()) {
      window.open(url, '_blank', 'noopener,noreferrer');
      onExtractionFailed?.('Extraction requires the mobile app. Use the Photo tab for best results.');
      return;
    }

    setIsExtracting(true);
    setStatus('idle');
    injectedRef.current = false;
    completedRef.current = false;

    try {
      console.log('[OpenInAzyah] Starting extraction for:', url);
      
      // === STEP 1: Register listeners BEFORE opening WebView ===
      
      // Listener for page load → inject extraction script
      const pageLoadedListener = await InAppBrowser.addListener(
        'browserPageLoaded',
        async () => {
          // Guard: only inject once per session (prevents re-injection on redirects/SPA)
          if (injectedRef.current || completedRef.current) {
            console.log('[OpenInAzyah] Skipping injection (already injected or completed)');
            return;
          }
          injectedRef.current = true;
          
          console.log('[OpenInAzyah] Page loaded, injecting extraction script...');
          
          try {
            const script = buildInjectionScript();
            await InAppBrowser.executeScript({ code: script });
            console.log('[OpenInAzyah] Extraction script injected');
          } catch (e) {
            console.error('[OpenInAzyah] Script injection failed:', e);
            // Don't complete here - let timeout handle it or user can close
          }
        }
      );
      listenersRef.current.push(pageLoadedListener);

      // Listener for message from WebView (extraction result)
      const messageListener = await InAppBrowser.addListener(
        'messageFromWebview',
        async (event: { detail?: { type?: string; data?: unknown } }) => {
          // Guard: only process first valid result
          if (completedRef.current) {
            console.log('[OpenInAzyah] Ignoring message (already completed)');
            return;
          }
          
          // Check message type
          if (event.detail?.type !== 'extraction_result') {
            console.log('[OpenInAzyah] Ignoring non-extraction message:', event.detail?.type);
            return;
          }
          
          completedRef.current = true;
          console.log('[OpenInAzyah] Received extraction result');
          
          // Parse the result using existing utility
          const parsed = parseExtractionResult(event.detail.data);
          
          if (parsed.success && parsed.context) {
            setStatus('success');
            
            const context: ProductContext = {
              page_url: parsed.context.page_url || url,
              extracted_from: 'azyah_webview',
              title: parsed.context.title,
              brand: parsed.context.brand,
              price: parsed.context.price,
              currency: parsed.context.currency,
              main_image_url: parsed.context.main_image_url,
              image_urls: parsed.context.image_urls,
              category_hint: parsed.context.category_hint,
              availability: parsed.context.availability,
              extraction_confidence: parsed.context.extraction_confidence,
            };

            console.log('[OpenInAzyah] ProductContext extracted:', {
              title: context.title?.slice(0, 50),
              brand: context.brand,
              main_image_url: context.main_image_url ? 'YES' : 'NO',
              extraction_confidence: context.extraction_confidence,
            });

            onContextExtracted?.(context);
          } else {
            setStatus('failed');
            const errorMsg = parsed.error || 'Could not extract product information';
            console.warn('[OpenInAzyah] Extraction failed:', errorMsg);
            onExtractionFailed?.(errorMsg);
          }
          
          // Close WebView and cleanup
          await closeAndCleanup();
        }
      );
      listenersRef.current.push(messageListener);

      // Listener for user closing the browser manually
      const closeListener = await InAppBrowser.addListener(
        'closeEvent',
        async () => {
          console.log('[OpenInAzyah] User closed browser');
          if (!completedRef.current) {
            // User cancelled before extraction completed
            setStatus('idle');
          }
          await cleanup();
          setIsExtracting(false);
        }
      );
      listenersRef.current.push(closeListener);

      // === STEP 2: Set up timeout (15 seconds) ===
      timeoutRef.current = setTimeout(async () => {
        if (!completedRef.current) {
          console.warn('[OpenInAzyah] Extraction timed out after 15s');
          completedRef.current = true;
          setStatus('failed');
          onExtractionFailed?.('Extraction timed out. The page may have blocked access. Try using the Photo tab instead.');
          await closeAndCleanup();
        }
      }, 15000);

      // === STEP 3: Open the WebView ===
      await InAppBrowser.openWebView({
        url,
        title: 'Loading product...',
        toolbarType: ToolBarType.NAVIGATION,
        toolbarColor: '#1f2937',
        showArrow: true,
        shareSubject: 'Product',
        isPresentAfterPageLoad: false,
      });
      
      console.log('[OpenInAzyah] WebView opened');

    } catch (err) {
      console.error('[OpenInAzyah] Error:', err);
      setStatus('failed');
      onExtractionFailed?.(err instanceof Error ? err.message : 'Failed to open browser');
      await cleanup();
      setIsExtracting(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleOpenInAzyah}
      disabled={isExtracting}
      className={cn(
        'gap-2 rounded-xl transition-all duration-200',
        status === 'success' && 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20',
        status === 'failed' && 'bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive/20',
        status === 'idle' && 'bg-primary/10 hover:bg-primary/20 border-primary/20 text-primary',
        className
      )}
    >
      {isExtracting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Extracting...
        </>
      ) : status === 'success' ? (
        <>
          <CheckCircle className="h-4 w-4" />
          Extracted!
        </>
      ) : status === 'failed' ? (
        <>
          <XCircle className="h-4 w-4" />
          Try Again
        </>
      ) : (
        <>
          <Globe className="h-4 w-4" />
          Open in Azyah
        </>
      )}
    </Button>
  );
}

export default OpenInAzyahButton;
