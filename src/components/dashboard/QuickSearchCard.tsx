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
      <div className="w-full p-2.5 bg-gradient-to-br from-primary/5 via-card to-accent/5 rounded-xl border border-border/50 shadow-sm">
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Find items, friends & brands"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClick={handleInputClick}
              className="pl-8 h-8 text-xs bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50"
              aria-label="Search products, users and brands"
            />
          </div>
        </form>
      </div>
    </div>
  );
}
