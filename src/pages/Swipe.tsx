
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, Search, Sliders, X } from 'lucide-react';
import SwipeDeck from '@/components/SwipeDeck';
import { useAuth } from '@/contexts/AuthContext';
import { TopCategory, SubCategory, getSubcategoriesForCategory } from '@/lib/categories';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

const Swipe = () => {
  const [filter, setFilter] = useState<string>('all');
  const [subcategory, setSubcategory] = useState<string>('');
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 1000 });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currency, setCurrency] = useState<string>('USD');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const { user } = useAuth();

  // Reset subcategory when category changes
  useEffect(() => {
    setSubcategory('');
  }, [filter]);

  const availableSubcategories = filter !== 'all' ? getSubcategoriesForCategory(filter as TopCategory) : [];

  const clearFilters = () => {
    setFilter('all');
    setSubcategory('');
    setPriceRange({ min: 0, max: 1000 });
    setSearchQuery('');
    setCurrency('USD');
  };

  const hasActiveFilters = filter !== 'all' || subcategory !== '' || priceRange.min > 0 || priceRange.max < 1000 || searchQuery !== '' || currency !== 'USD';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/20 to-secondary/20 p-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-foreground mb-1">Your Fashion Feed</h1>
          <p className="text-sm text-muted-foreground">Swipe through curated collections tailored just for you</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                  <Filter className="h-4 w-4" />
                  {hasActiveFilters && (
                    <Badge className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-xs">
                      !
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                
                <div className="space-y-6 mt-6">
                  {/* Category Filter */}
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <Select value={filter} onValueChange={setFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="clothing">Clothing</SelectItem>
                        <SelectItem value="shoes">Shoes</SelectItem>
                        <SelectItem value="bags">Bags</SelectItem>
                        <SelectItem value="accessories">Accessories</SelectItem>
                        <SelectItem value="beauty">Beauty</SelectItem>
                        <SelectItem value="home">Home & Living</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Subcategory Filter */}
                  {availableSubcategories.length > 0 && (
                    <div>
                      <label className="text-sm font-medium">Subcategory</label>
                      <Select value={subcategory} onValueChange={setSubcategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subcategory" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Subcategories</SelectItem>
                          {availableSubcategories.map((sub) => (
                            <SelectItem key={sub.slug} value={sub.slug}>
                              {sub.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Price Range */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Price Range: ${priceRange.min} - ${priceRange.max}
                    </label>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-muted-foreground">Min: ${priceRange.min}</label>
                        <Slider
                          value={[priceRange.min]}
                          onValueChange={([value]) => setPriceRange(prev => ({ ...prev, min: value }))}
                          max={1000}
                          min={0}
                          step={10}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Max: ${priceRange.max}</label>
                        <Slider
                          value={[priceRange.max]}
                          onValueChange={([value]) => setPriceRange(prev => ({ ...prev, max: value }))}
                          max={1000}
                          min={0}
                          step={10}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Currency */}
                  <div>
                    <label className="text-sm font-medium">Currency</label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="CAD">CAD ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Clear Filters */}
                  {hasActiveFilters && (
                    <Button 
                      variant="outline" 
                      onClick={clearFilters}
                      className="w-full"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear All Filters
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mt-3">
              {filter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  {filter}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setFilter('all')}
                  />
                </Badge>
              )}
              {subcategory && (
                <Badge variant="secondary" className="gap-1">
                  {subcategory}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setSubcategory('')}
                  />
                </Badge>
              )}
              {(priceRange.min > 0 || priceRange.max < 1000) && (
                <Badge variant="secondary" className="gap-1">
                  ${priceRange.min} - ${priceRange.max}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setPriceRange({ min: 0, max: 1000 })}
                  />
                </Badge>
              )}
              {currency !== 'USD' && (
                <Badge variant="secondary" className="gap-1">
                  {currency}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setCurrency('USD')}
                  />
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Swipe Deck */}
      <div className="flex-1 p-4">
        <div className="max-w-md mx-auto h-[calc(100vh-200px)]">
          <SwipeDeck
            filter={filter}
            subcategory={subcategory}
            priceRange={priceRange}
            searchQuery={searchQuery}
            currency={currency}
          />
        </div>
      </div>
    </div>
  );
};

export default Swipe;
