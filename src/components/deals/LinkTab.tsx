import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link2, Loader2, ExternalLink, ImageIcon } from 'lucide-react';
import { useDealsFromUrl } from '@/hooks/useDealsFromUrl';
import { PriceVerdict } from './PriceVerdict';
import { DealResultCard } from './DealResultCard';

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
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="url"
            placeholder="Paste product URL here..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="pl-10 h-11"
            style={{ fontSize: '16px' }}
            disabled={isLoading}
          />
        </div>
        <Button 
          type="submit" 
          className="w-full gap-2"
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

      {/* Extracted product preview */}
      {data?.extracted_product?.title && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          {data.extracted_product.image ? (
            <div className="w-14 h-14 rounded-lg overflow-hidden bg-background flex-shrink-0">
              <img 
                src={data.extracted_product.image} 
                alt={data.extracted_product.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium line-clamp-2">{data.extracted_product.title}</p>
            {data.extracted_product.brand && (
              <p className="text-xs text-muted-foreground">{data.extracted_product.brand}</p>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-4">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={handleReset}>
            Try again
          </Button>
        </div>
      )}

      {/* Results */}
      {data && !isLoading && (
        <div className="space-y-4">
          {/* Deals count */}
          {data.deals_found > 0 && (
            <p className="text-sm font-medium text-green-600 text-center">
              {data.deals_found}+ deals found
            </p>
          )}

          {/* Price Verdict */}
          <PriceVerdict
            low={data.price_stats.low}
            median={data.price_stats.median}
            high={data.price_stats.high}
            validCount={data.price_stats.valid_count}
          />

          {/* Disclaimer */}
          <p className="text-[10px] text-muted-foreground text-center">
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
              <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No deals found for this product
              </p>
            </div>
          )}

          {/* Try another */}
          {data.deals_found > 0 && (
            <Button variant="outline" className="w-full" onClick={handleReset}>
              Search another URL
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default LinkTab;
