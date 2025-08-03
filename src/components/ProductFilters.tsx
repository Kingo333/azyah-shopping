import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, X, Filter } from 'lucide-react';
import { useCategories } from '@/hooks/useProducts';

export interface FilterState {
  categories: string[];
  priceRange: [number, number];
  occasion: string[];
  material: string[];
  color: string[];
  size: string[];
}

interface ProductFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  isSticky?: boolean;
}

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  filters,
  onFiltersChange,
  isSticky = false
}) => {
  const { data: categories } = useCategories();
  const [isOpen, setIsOpen] = useState(false);

  const occasions = ['casual', 'formal', 'business', 'evening', 'party', 'athleisure', 'beach', 'Ramadan', 'Eid'];
  const materials = ['silk', 'cotton', 'chiffon', 'satin', 'denim', 'leather', 'polyester', 'viscose', 'crepe'];
  const colors = [
    { name: 'Black', value: '#000000' },
    { name: 'Navy', value: '#000080' },
    { name: 'White', value: '#ffffff' },
    { name: 'Gold', value: '#ffd700' },
    { name: 'Emerald', value: '#50c878' },
    { name: 'Rose', value: '#b76e79' },
    { name: 'Coral', value: '#ff7f50' }
  ];
  const sizes = ['XS', 'S', 'M', 'L', 'XL', '6', '7', '8', '9', '10', '29', '30', '32', '34'];

  const toggleFilter = (category: keyof FilterState, value: string) => {
    const currentValues = filters[category] as string[];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    
    onFiltersChange({
      ...filters,
      [category]: newValues
    });
  };

  const updatePriceRange = (newRange: number[]) => {
    onFiltersChange({
      ...filters,
      priceRange: [newRange[0], newRange[1]]
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      categories: [],
      priceRange: [0, 2000],
      occasion: [],
      material: [],
      color: [],
      size: []
    });
  };

  const activeFilterCount = filters.categories.length + filters.occasion.length + 
    filters.material.length + filters.color.length + filters.size.length;

  return (
    <div className={`bg-card border-b ${isSticky ? 'sticky top-0 z-40' : ''}`}>
      <div className="container mx-auto px-4">
        {/* Mobile Filter Toggle */}
        <div className="flex items-center justify-between py-4 md:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeFilterCount}
              </Badge>
            )}
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
          
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              Clear All
            </Button>
          )}
        </div>

        {/* Desktop Filters - Always Visible */}
        <div className="hidden md:block py-4">
          <FilterContent
            categories={categories}
            filters={filters}
            toggleFilter={toggleFilter}
            updatePriceRange={updatePriceRange}
            clearAllFilters={clearAllFilters}
            occasions={occasions}
            materials={materials}
            colors={colors}
            sizes={sizes}
            activeFilterCount={activeFilterCount}
          />
        </div>

        {/* Mobile Filters - Collapsible */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="md:hidden">
          <CollapsibleContent className="pb-4">
            <FilterContent
              categories={categories}
              filters={filters}
              toggleFilter={toggleFilter}
              updatePriceRange={updatePriceRange}
              clearAllFilters={clearAllFilters}
              occasions={occasions}
              materials={materials}
              colors={colors}
              sizes={sizes}
              activeFilterCount={activeFilterCount}
            />
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
};

interface FilterContentProps {
  categories: any[] | undefined;
  filters: FilterState;
  toggleFilter: (category: keyof FilterState, value: string) => void;
  updatePriceRange: (range: number[]) => void;
  clearAllFilters: () => void;
  occasions: string[];
  materials: string[];
  colors: { name: string; value: string }[];
  sizes: string[];
  activeFilterCount: number;
}

const FilterContent: React.FC<FilterContentProps> = ({
  categories,
  filters,
  toggleFilter,
  updatePriceRange,
  clearAllFilters,
  occasions,
  materials,
  colors,
  sizes,
  activeFilterCount
}) => {
  return (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <h3 className="text-sm font-medium mb-3">Categories</h3>
        <div className="flex flex-wrap gap-2">
          {categories?.filter(cat => !cat.parent_id).map(category => (
            <Badge
              key={category.id}
              variant={filters.categories.includes(category.slug) ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/10 transition-colors"
              onClick={() => toggleFilter('categories', category.slug)}
            >
              {category.name}
              {filters.categories.includes(category.slug) && (
                <X className="h-3 w-3 ml-1" />
              )}
            </Badge>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h3 className="text-sm font-medium mb-3">
          Price Range: ${filters.priceRange[0]} - ${filters.priceRange[1]}
        </h3>
        <Slider
          value={filters.priceRange}
          onValueChange={updatePriceRange}
          max={2000}
          min={0}
          step={50}
          className="w-full"
        />
      </div>

      {/* Occasion */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
          <h3 className="text-sm font-medium">Occasion</h3>
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <div className="flex flex-wrap gap-2">
            {occasions.map(occasion => (
              <Badge
                key={occasion}
                variant={filters.occasion.includes(occasion) ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary/10 transition-colors capitalize"
                onClick={() => toggleFilter('occasion', occasion)}
              >
                {occasion}
                {filters.occasion.includes(occasion) && (
                  <X className="h-3 w-3 ml-1" />
                )}
              </Badge>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Material */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
          <h3 className="text-sm font-medium">Material</h3>
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <div className="flex flex-wrap gap-2">
            {materials.map(material => (
              <Badge
                key={material}
                variant={filters.material.includes(material) ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary/10 transition-colors capitalize"
                onClick={() => toggleFilter('material', material)}
              >
                {material}
                {filters.material.includes(material) && (
                  <X className="h-3 w-3 ml-1" />
                )}
              </Badge>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Color */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
          <h3 className="text-sm font-medium">Color</h3>
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <div className="flex flex-wrap gap-2">
            {colors.map(color => (
              <div
                key={color.value}
                className={`flex items-center gap-2 px-3 py-1 rounded-full border cursor-pointer transition-colors ${
                  filters.color.includes(color.value) 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'bg-background border-border hover:bg-accent'
                }`}
                onClick={() => toggleFilter('color', color.value)}
              >
                <div 
                  className="w-3 h-3 rounded-full border border-border" 
                  style={{ backgroundColor: color.value }}
                />
                <span className="text-sm">{color.name}</span>
                {filters.color.includes(color.value) && (
                  <X className="h-3 w-3" />
                )}
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Size */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
          <h3 className="text-sm font-medium">Size</h3>
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <div className="flex flex-wrap gap-2">
            {sizes.map(size => (
              <Badge
                key={size}
                variant={filters.size.includes(size) ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary/10 transition-colors"
                onClick={() => toggleFilter('size', size)}
              >
                {size}
                {filters.size.includes(size) && (
                  <X className="h-3 w-3 ml-1" />
                )}
              </Badge>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Clear All Filters */}
      {activeFilterCount > 0 && (
        <div className="pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={clearAllFilters}
            className="w-full md:w-auto"
          >
            Clear All Filters ({activeFilterCount})
          </Button>
        </div>
      )}
    </div>
  );
};