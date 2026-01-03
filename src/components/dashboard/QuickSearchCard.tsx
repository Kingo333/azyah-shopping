import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Package, Users, Store } from 'lucide-react';

interface QuickSearchCardProps {
  onOpenSearch: (query: string, tab?: 'products' | 'users' | 'brands') => void;
}

const categories = [
  { id: 'products' as const, label: 'Products', icon: Package },
  { id: 'users' as const, label: 'Shoppers', icon: Users },
  { id: 'brands' as const, label: 'Brands', icon: Store },
];

export function QuickSearchCard({ onOpenSearch }: QuickSearchCardProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onOpenSearch(query);
  };

  const handleInputClick = () => {
    onOpenSearch(query);
  };

  const handleCategoryClick = (tab: 'products' | 'users' | 'brands') => {
    onOpenSearch(query, tab);
  };

  return (
    <div className="h-full flex items-center">
      <div className="w-full p-2 bg-gradient-to-br from-primary/5 via-card to-accent/5 rounded-xl border border-border/50 shadow-sm">
        <div className="flex gap-1.5">
          {/* Search Input - takes more space */}
          <form onSubmit={handleSubmit} className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Find items, friends & brands"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onClick={handleInputClick}
                className="pl-7 h-8 text-xs bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50"
                aria-label="Search products, users and brands"
              />
            </div>
          </form>
          
          {/* Category buttons - icon only */}
          {categories.map(({ id, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleCategoryClick(id)}
              className="flex items-center justify-center p-2 rounded-lg bg-background/60 hover:bg-[hsl(var(--azyah-maroon))]/10 border border-[hsl(var(--azyah-maroon))]/20 hover:border-[hsl(var(--azyah-maroon))]/40 transition-all duration-200 group"
            >
              <Icon className="h-3.5 w-3.5 text-[hsl(var(--azyah-maroon))]/70 group-hover:text-[hsl(var(--azyah-maroon))] transition-colors" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
