import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface QuickSearchCardProps {
  onOpenSearch: (query: string, tab?: 'products' | 'users' | 'brands') => void;
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
      <div className="w-full py-3 px-4 bg-card rounded-xl border border-border shadow-sm">
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Find items, friends & brands"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClick={handleInputClick}
              className="pl-10 h-10 text-sm bg-muted/50 border-0 focus:ring-2 focus:ring-primary/20 rounded-lg"
              aria-label="Search products, users and brands"
            />
          </div>
        </form>
      </div>
    </div>
  );
}