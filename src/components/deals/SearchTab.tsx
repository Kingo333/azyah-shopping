import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, ImageIcon, Check } from 'lucide-react';
import { useDealsSearch } from '@/hooks/useDealsSearch';
import { useDealsMatchCatalog } from '@/hooks/useDealsMatchCatalog';
import { PriceVerdict } from './PriceVerdict';
import { DealResultCard } from './DealResultCard';
import { AzyahMatchesSection } from './AzyahMatchesSection';

interface SearchTabProps {
  onClose?: () => void;
  initialQuery?: string;
}

export function SearchTab({ onClose, initialQuery = '' }: SearchTabProps) {
  const [query, setQuery] = useState(initialQuery);
  const { search, data, isLoading, error, reset } = useDealsSearch();
  const { matchCatalog, data: catalogData, isLoading: catalogLoading, reset: resetCatalog } = useDealsMatchCatalog();

  // Trigger catalog match when we get results
  useEffect(() => {
    if (data?.query) {
      const avgPrice = data.price_stats.median ? data.price_stats.median * 100 : undefined;
      matchCatalog(data.query, undefined, avgPrice);
    }
  }, [data, matchCatalog]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    resetCatalog();
    await search(query.trim());
  };

  const handleReset = () => {
    setQuery('');
    reset();
    resetCatalog();
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input
            type="text"
            placeholder="Search for a product..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
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
          disabled={!query.trim() || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching deals...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Search Deals
            </>
          )}
        </Button>
      </form>

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
          {/* Search query confirmation with glass panel */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/50 dark:bg-white/10 backdrop-blur-xl border border-white/20">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">
                "<span className="font-medium text-foreground">{data.query}</span>"
              </p>
            </div>
            {data.deals_found > 0 && (
              <div className="flex items-center gap-1">
                <Check className="h-3.5 w-3.5 text-green-500" />
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  {data.deals_found}+
                </span>
              </div>
            )}
          </div>

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
            {data.shopping_results.slice(0, 20).map((result, index) => (
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
                No deals found for "{data.query}"
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Try a different search term
              </p>
            </div>
          )}

          {/* New search */}
          {data.deals_found > 0 && (
            <Button 
              variant="outline" 
              className="w-full rounded-xl bg-white/50 dark:bg-white/10 border-white/30 hover:bg-white/70" 
              onClick={handleReset}
            >
              New Search
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchTab;
