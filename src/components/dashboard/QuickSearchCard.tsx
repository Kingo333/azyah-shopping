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
      <div className="w-full p-2.5 bg-card rounded-xl border border-border shadow-sm">
        <div className="flex flex-col gap-1.5">
          {/* Single clear title */}
          <h3 className="text-xs font-medium text-foreground">
            Find items, friends & brands
          </h3>
          
          {/* Search Input */}
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onClick={handleInputClick}
                className="pl-7 h-7 text-xs bg-background"
                aria-label="Search products, users and brands"
              />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
