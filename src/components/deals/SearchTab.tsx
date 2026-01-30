import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, ImageIcon } from 'lucide-react';
import { useDealsSearch } from '@/hooks/useDealsSearch';
import { PriceVerdict } from './PriceVerdict';
import { DealResultCard } from './DealResultCard';

interface SearchTabProps {
  onClose?: () => void;
  initialQuery?: string;
}

export function SearchTab({ onClose, initialQuery = '' }: SearchTabProps) {
  const [query, setQuery] = useState(initialQuery);
  const { search, data, isLoading, error, reset } = useDealsSearch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    await search(query.trim());
  };

  const handleReset = () => {
    setQuery('');
    reset();
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search for a product..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 h-11"
            style={{ fontSize: '16px' }}
            disabled={isLoading}
          />
        </div>
        <Button 
          type="submit" 
          className="w-full gap-2"
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
          <Button variant="outline" size="sm" className="mt-3" onClick={handleReset}>
            Try again
          </Button>
        </div>
      )}

      {/* Results */}
      {data && !isLoading && (
        <div className="space-y-4">
          {/* Search query confirmation */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Results for "<span className="font-medium text-foreground">{data.query}</span>"
            </p>
            {data.deals_found > 0 && (
              <span className="text-sm font-medium text-green-600">
                {data.deals_found}+ deals
              </span>
            )}
          </div>

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
              <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No deals found for "{data.query}"
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Try a different search term
              </p>
            </div>
          )}

          {/* New search */}
          {data.deals_found > 0 && (
            <Button variant="outline" className="w-full" onClick={handleReset}>
              New Search
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchTab;
