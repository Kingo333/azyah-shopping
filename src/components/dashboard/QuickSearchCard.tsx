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
    // Open search immediately when clicking the input
    onOpenSearch(query);
  };

  return (
    <div className="h-full flex items-center">
      <div className="w-full p-4 bg-card rounded-xl border border-border shadow-sm">
        <div className="flex flex-col gap-3">
          {/* Header */}
          <div>
            <h3 className="text-sm font-medium text-foreground">
              Search outfits, friends & brands
            </h3>
            <p className="text-xs text-muted-foreground">
              Find items, creators and stores in one place
            </p>
          </div>
          
          {/* Search Input */}
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onClick={handleInputClick}
                className="pl-9 h-10 bg-background"
                aria-label="Search products, users and brands"
              />
            </div>
          </form>
          
          {/* Quick Category Icons */}
          <div className="flex items-center gap-4 pt-1">
            <button 
              onClick={() => onOpenSearch('')}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              type="button"
            >
              <Package className="h-3.5 w-3.5" />
              <span>Products</span>
            </button>
            <button 
              onClick={() => onOpenSearch('')}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              type="button"
            >
              <Users className="h-3.5 w-3.5" />
              <span>Shoppers</span>
            </button>
            <button 
              onClick={() => onOpenSearch('')}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              type="button"
            >
              <Store className="h-3.5 w-3.5" />
              <span>Brands</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
