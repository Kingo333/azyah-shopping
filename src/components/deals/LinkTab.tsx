import React, { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link2, Loader2, ExternalLink, ImageIcon, AlertCircle } from 'lucide-react';
import { useDealsFromUrl } from '@/hooks/useDealsFromUrl';
import { useDealsMatchCatalog } from '@/hooks/useDealsMatchCatalog';
import { PriceVerdict } from './PriceVerdict';
import { DealResultCard } from './DealResultCard';
import { ScanPanel } from './ScanPanel';
import { AzyahMatchesSection } from './AzyahMatchesSection';
import { OpenInAzyahButton } from './OpenInAzyahButton';

interface LinkTabProps {
  onClose?: () => void;
}

// Sites that commonly block server-side requests
const BLOCKED_SITES = ['asos.com', 'zara.com', 'nike.com', 'hm.com', 'uniqlo.com'];

export function LinkTab({ onClose }: LinkTabProps) {
  const [url, setUrl] = useState('');
  const { searchFromUrl, data, isLoading, error, reset } = useDealsFromUrl();
  const { matchCatalog, data: catalogData, isLoading: catalogLoading, reset: resetCatalog } = useDealsMatchCatalog();

  // Trigger catalog match when we get results
  useEffect(() => {
    if (data?.extracted_product?.title || data?.shopping_results?.length > 0) {
      const queryTitle = data.extracted_product?.title || data.shopping_results[0]?.title || '';
      const avgPrice = data.price_stats.median ? data.price_stats.median * 100 : undefined;
      if (queryTitle) {
        matchCatalog(queryTitle, undefined, avgPrice);
      }
    }
  }, [data, matchCatalog]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    // Validate URL
    try {
      new URL(url.trim());
    } catch {
      return;
    }

    resetCatalog();
    await searchFromUrl(url.trim());
  };

  const handleReset = () => {
    setUrl('');
    reset();
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
      {(data?.extracted_product?.title || isLoading) && (
        <ScanPanel
          type="link"
          thumbnail={data?.extracted_product?.image}
          title={data?.extracted_product?.title}
          isLoading={isLoading}
          dealsFound={data?.deals_found}
          onReset={!isLoading ? handleReset : undefined}
        />
      )}

      {/* Blocked site warning */}
      {isBlockedSite && !isLoading && !data && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <div className="space-y-2">
            <p className="text-sm text-foreground">
              This site may block automatic extraction. For best results:
            </p>
            <OpenInAzyahButton url={url} className="w-full" />
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
          <p className="text-sm text-muted-foreground">{data.suggestion}</p>
          <OpenInAzyahButton url={url} />
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
