import React, { useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Button } from '@/components/ui/button';
import { Loader2, Globe, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EXTRACTION_SCRIPT } from '@/lib/webview-extractor';
import type { ProductContext } from '@/types/ProductContext';
import type { AzyahWebViewExtractorPlugin } from '@/types/webview-extractor-plugin';

// Register the plugin for native platforms
const AzyahWebViewExtractor = registerPlugin<AzyahWebViewExtractorPlugin>(
  'AzyahWebViewExtractor'
);

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
 * for Phia-style in-session product extraction.
 * 
 * - iOS: Uses WKWebView with evaluateJavaScript
 * - Android: Uses WebView with evaluateJavascript
 * - Web: Opens URL in new tab (extraction not possible)
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

  const handleOpenInAzyah = async () => {
    // Web fallback: just open URL in new tab
    if (!Capacitor.isNativePlatform()) {
      window.open(url, '_blank', 'noopener,noreferrer');
      onExtractionFailed?.('Extraction requires the mobile app. Use the Photo tab for best results.');
      return;
    }

    setIsExtracting(true);
    setStatus('idle');

    try {
      console.log('[OpenInAzyah] Starting extraction for:', url);
      
      const result = await AzyahWebViewExtractor.openAndExtract({
        url,
        script: EXTRACTION_SCRIPT,
        timeoutMs: 15000,
        toolbarColor: '#1f2937',
        showToolbar: true,
      });

      console.log('[OpenInAzyah] Extraction result:', {
        success: result.success,
        cancelled: result.cancelled,
        extraction_method: result.extraction_method,
        has_context: !!result.context,
      });

      // User cancelled - just reset
      if (result.cancelled) {
        setStatus('idle');
        return;
      }

      // Successful extraction
      if (result.success && result.context) {
        setStatus('success');
        
        const context: ProductContext = {
          page_url: result.context.page_url || url,
          extracted_from: 'azyah_webview',
          title: result.context.title,
          brand: result.context.brand,
          price: result.context.price,
          currency: result.context.currency,
          main_image_url: result.context.main_image_url,
          image_urls: result.context.image_urls,
          category_hint: result.context.category_hint,
          availability: result.context.availability,
          extraction_confidence: result.context.extraction_confidence,
        };

        console.log('[OpenInAzyah] ProductContext extracted:', {
          title: context.title?.slice(0, 50),
          brand: context.brand,
          main_image_url: context.main_image_url ? 'YES' : 'NO',
          extraction_confidence: context.extraction_confidence,
        });

        onContextExtracted?.(context);
      } else {
        // Extraction failed
        setStatus('failed');
        const errorMsg = result.error || 'Could not extract product information';
        console.warn('[OpenInAzyah] Extraction failed:', errorMsg);
        onExtractionFailed?.(errorMsg);
      }
    } catch (err) {
      console.error('[OpenInAzyah] Plugin error:', err);
      setStatus('failed');
      onExtractionFailed?.(err instanceof Error ? err.message : 'Extraction failed');
    } finally {
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
        status === 'success' && 'bg-green-500/10 border-green-500/20 text-green-600 hover:bg-green-500/20',
        status === 'failed' && 'bg-red-500/10 border-red-500/20 text-red-600 hover:bg-red-500/20',
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
