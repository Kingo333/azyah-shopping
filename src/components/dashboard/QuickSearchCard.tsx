import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Users, Package, Store } from 'lucide-react';

interface QuickSearchCardProps {
  onOpenSearch: (query: string) => void;
}

export function QuickSearchCard({ onOpenSearch }: QuickSearchCardProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onOpenSearch(query);
  };

  const handleInputClick = () => {
    onOpenSearch(query);
  };

  return (
    <div className="h-full flex items-center">
      <div className="w-full p-3 bg-card rounded-xl border border-border shadow-sm">
        <div className="flex flex-col gap-2">
          {/* Header - more compact */}
          <div>
            <h3 className="text-sm font-medium text-foreground leading-tight">
              Search outfits, friends & brands
            </h3>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Find items, creators and stores
            </p>
          </div>
          
          {/* Search Input */}
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onClick={handleInputClick}
                className="pl-8 h-8 text-sm bg-background"
                aria-label="Search products, users and brands"
              />
            </div>
          </form>
          
          {/* Quick Category Icons - tighter spacing */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onOpenSearch('')}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              type="button"
            >
              <Package className="h-3 w-3" />
              <span>Products</span>
            </button>
            <button 
              onClick={() => onOpenSearch('')}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              type="button"
            >
              <Users className="h-3 w-3" />
              <span>Shoppers</span>
            </button>
            <button 
              onClick={() => onOpenSearch('')}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              type="button"
            >
              <Store className="h-3 w-3" />
              <span>Brands</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
