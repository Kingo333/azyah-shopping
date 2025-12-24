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
      <div className="w-full p-3 bg-gradient-to-br from-primary/5 via-card to-accent/5 rounded-xl border border-border/50 shadow-sm">
        <div className="flex flex-col gap-2">
          {/* Branded title */}
          <div className="flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5 text-primary" />
            <h3 className="text-xs font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Find items, friends & brands
            </h3>
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
                className="pl-8 h-8 text-xs bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50"
                aria-label="Search products, users and brands"
              />
            </div>
          </form>
          
          {/* Category buttons */}
          <div className="flex gap-1.5">
            {categories.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleCategoryClick(id)}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-background/60 hover:bg-primary/10 border border-border/30 hover:border-primary/30 transition-all duration-200 group"
              >
                <Icon className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-[10px] font-medium text-muted-foreground group-hover:text-primary transition-colors">
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
