import React, { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link2, Loader2, ExternalLink, ImageIcon, AlertCircle, Sparkles } from 'lucide-react';
import { useDealsFromUrl } from '@/hooks/useDealsFromUrl';
import { useDealsFromContext } from '@/hooks/useDealsFromContext';
import { useDealsMatchCatalog } from '@/hooks/useDealsMatchCatalog';
import { PriceVerdict } from './PriceVerdict';
import { DealResultCard } from './DealResultCard';
import { ScanPanel } from './ScanPanel';
import { AzyahMatchesSection } from './AzyahMatchesSection';
import { OpenInAzyahButton } from './OpenInAzyahButton';
import type { ProductContext } from '@/types/ProductContext';

interface LinkTabProps {
  onClose?: () => void;
}

// Sites that commonly block server-side requests
const BLOCKED_SITES = ['asos.com', 'zara.com', 'nike.com', 'hm.com', 'uniqlo.com'];

export function LinkTab({ onClose }: LinkTabProps) {
  const [url, setUrl] = useState('');
  
  // URL paste flow (fallback)
  const { 
    searchFromUrl, 
    data: urlData, 
    isLoading: urlLoading, 
    error: urlError, 
    reset: resetUrl 
  } = useDealsFromUrl();
  
  // Context extraction flow (Phia-style)
  const { 
    searchFromContext, 
    data: contextData, 
    isLoading: contextLoading, 
    error: contextError, 
    reset: resetContext 
  } = useDealsFromContext();
  
  // Catalog matching
  const { 
    matchCatalog, 
    data: catalogData, 
    isLoading: catalogLoading, 
    reset: resetCatalog 
  } = useDealsMatchCatalog();

  // Combined state (prefer context data over URL data)
  const data = contextData || urlData;
  const isLoading = contextLoading || urlLoading;
  const error = contextError || urlError;
  const isContextMode = !!contextData;

  // Trigger catalog match when we get results
  useEffect(() => {
    const results = data?.shopping_results;
    // Use input_context from context mode, or extracted_product from URL mode
    const queryTitle = isContextMode 
      ? (contextData?.input_context?.title || results?.[0]?.title || '')
      : (urlData?.extracted_product?.title || results?.[0]?.title || '');
    
    if (queryTitle) {
      const avgPrice = data?.price_stats?.median ? data.price_stats.median * 100 : undefined;
      matchCatalog(queryTitle, undefined, avgPrice);
    }
  }, [data, matchCatalog, isContextMode, contextData, urlData]);

  // Handler for successful WebView extraction
  const handleContextExtracted = async (context: ProductContext) => {
    console.log('[LinkTab] ProductContext extracted from WebView:', {
      title: context.title?.slice(0, 40),
      brand: context.brand,
      main_image_url: context.main_image_url ? 'YES' : 'NO',
      extraction_confidence: context.extraction_confidence,
    });
    
    // Clear previous results and search with context
    resetUrl();
    resetCatalog();
    await searchFromContext(context);
  };

  // Handler for WebView extraction failure - fall back to URL paste
  const handleExtractionFailed = async (errorMsg: string) => {
    console.warn('[LinkTab] WebView extraction failed:', errorMsg);
    
    // Fall back to URL paste flow if we have a valid URL
    if (url.trim()) {
      resetContext();
      resetCatalog();
      await searchFromUrl(url.trim());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    // Validate URL
    try {
      new URL(url.trim());
    } catch {
      return;
    }

    // Use URL paste flow for manual submission
    resetContext();
    resetCatalog();
    await searchFromUrl(url.trim());
  };

  const handleReset = () => {
    setUrl('');
    resetUrl();
    resetContext();
    resetCatalog();
  };

  const isValidUrl = useMemo(() => {
    try {
      new URL(url.trim());
      return true;
    } catch {
      return false;
    }
  }, [url]);

  // Check if URL is from a commonly blocked site (precise domain matching)
  const isBlockedSite = useMemo(() => {
    if (!isValidUrl) return false;
    try {
      const hostname = new URL(url.trim()).hostname.toLowerCase();
      // Match exact domain or subdomain (e.g., www.asos.com, m.zara.com)
      return BLOCKED_SITES.some(site => 
        hostname === site || hostname.endsWith('.' + site)
      );
    } catch {
      return false;
    }
  }, [url, isValidUrl]);

  // Show suggestion when results are low but we have a URL
  const showSuggestion = data?.suggestion && data.deals_found < 5;

  // Get extracted product info for display
  const extractedProduct = isContextMode 
    ? {
        title: contextData?.input_context?.title,
        image: contextData?.input_context?.main_image_url,
      }
    : urlData?.extracted_product;

  return (
    <div className="space-y-4">
      {/* URL Input */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input
            type="url"
            placeholder="Paste product URL here..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="
              pl-10 h-12 
              bg-white/50 dark:bg-white/10 
              backdrop-blur-sm 
              border-white/30 dark:border-white/20 
              rounded-xl
              focus:ring-2 focus:ring-primary/30
              focus:border-primary/50
              placeholder:text-muted-foreground/50
            "
            style={{ fontSize: '16px' }}
            disabled={isLoading}
          />
        </div>
        <Button 
          type="submit" 
          className="
            w-full gap-2 h-11 rounded-xl
            bg-gradient-to-r from-slate-700 to-slate-800
            hover:from-slate-600 hover:to-slate-700
            text-white font-medium
            shadow-lg
            transition-all duration-200
          "
          disabled={!isValidUrl || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Finding deals...
            </>
          ) : (
            <>
              <ExternalLink className="h-4 w-4" />
              Find Better Deals
            </>
          )}
        </Button>
      </form>

      {/* Scan Panel with extracted product */}
      {(extractedProduct?.title || isLoading) && (
        <ScanPanel
          type="link"
          thumbnail={extractedProduct?.image}
          title={extractedProduct?.title}
          isLoading={isLoading}
          dealsFound={data?.deals_found}
          onReset={!isLoading ? handleReset : undefined}
        />
      )}

      {/* Context mode indicator */}
      {isContextMode && !isLoading && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
          <Sparkles className="h-4 w-4 text-green-500" />
          <span className="text-xs text-green-600 dark:text-green-400">
            Enhanced search using extracted product data
          </span>
        </div>
      )}

      {/* Blocked site warning with OpenInAzyah button */}
      {isBlockedSite && !isLoading && !data && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <div className="space-y-2 flex-1">
            <p className="text-sm text-foreground">
              This site may block automatic extraction. For best results:
            </p>
            <OpenInAzyahButton 
              url={url} 
              onContextExtracted={handleContextExtracted}
              onExtractionFailed={handleExtractionFailed}
              className="w-full" 
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-4">
          <p className="text-sm text-destructive">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-3 rounded-xl bg-white/50 border-white/30" 
            onClick={handleReset}
          >
            Try again
          </Button>
        </div>
      )}

      {/* Low results suggestion */}
      {showSuggestion && (
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-center space-y-2">
          <p className="text-sm text-muted-foreground">{data?.suggestion}</p>
          <OpenInAzyahButton 
            url={url}
            onContextExtracted={handleContextExtracted}
            onExtractionFailed={handleExtractionFailed}
          />
        </div>
      )}

      {/* Results */}
      {data && !isLoading && (
        <div className="space-y-4">
          {/* Price Verdict */}
          <PriceVerdict
            low={data.price_stats.low}
            median={data.price_stats.median}
            high={data.price_stats.high}
            validCount={data.price_stats.valid_count}
          />

          {/* Similar on Azyah */}
          <AzyahMatchesSection 
            matches={catalogData?.matches || []} 
            isLoading={catalogLoading}
          />

          {/* Disclaimer */}
          <p className="text-[10px] text-muted-foreground/70 text-center">
            Results pulled from public web listings. Prices may change.
          </p>

          {/* Results list */}
          <div className="space-y-2">
            {data.shopping_results.slice(0, 15).map((result, index) => (
              <DealResultCard
                key={`${result.link}-${index}`}
                result={result}
                isBestDeal={index === 0 && result.extracted_price !== null}
              />
            ))}
          </div>

          {data.shopping_results.length === 0 && (
            <div className="text-center py-6">
              <ImageIcon className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No deals found for this product
              </p>
            </div>
          )}

          {/* Try another */}
          {data.deals_found > 0 && (
            <Button 
              variant="outline" 
              className="w-full rounded-xl bg-white/50 dark:bg-white/10 border-white/30 hover:bg-white/70" 
              onClick={handleReset}
            >
              Search another URL
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default LinkTab;
