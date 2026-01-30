import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link2, Loader2, ExternalLink, ImageIcon } from 'lucide-react';
import { useDealsFromUrl } from '@/hooks/useDealsFromUrl';
import { PriceVerdict } from './PriceVerdict';
import { DealResultCard } from './DealResultCard';
import { ScanPanel } from './ScanPanel';

interface LinkTabProps {
  onClose?: () => void;
}

export function LinkTab({ onClose }: LinkTabProps) {
  const [url, setUrl] = useState('');
  const { searchFromUrl, data, isLoading, error, reset } = useDealsFromUrl();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    // Validate URL
    try {
      new URL(url.trim());
    } catch {
      return;
    }

    await searchFromUrl(url.trim());
  };

  const handleReset = () => {
    setUrl('');
    reset();
  };

  const isValidUrl = (() => {
    try {
      new URL(url.trim());
      return true;
    } catch {
      return false;
    }
  })();

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
              focus:ring-2 focus:ring-amber-500/30
              focus:border-amber-500/50
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
            bg-gradient-to-r from-amber-500 to-orange-500
            hover:from-amber-600 hover:to-orange-600
            text-white font-medium
            shadow-[0_4px_16px_rgba(251,191,36,0.3)]
            hover:shadow-[0_6px_20px_rgba(251,191,36,0.4)]
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
