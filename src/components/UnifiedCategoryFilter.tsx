import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, X, Filter } from 'lucide-react';
import { 
  CATEGORY_TREE, 
  GENDER_OPTIONS, 
  getCategoryDisplayName, 
  getSubcategoryDisplayName, 
  getGenderDisplayName 
} from '@/lib/categories';
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';
import type { TopCategory, SubCategory, Gender } from '@/lib/categories';

// Fix type issues with array casting
type SafeTopCategory = TopCategory;
type SafeSubCategory = SubCategory;
type SafeGender = Gender;

export interface UnifiedFilterState {
  genders: SafeGender[];
  categories: SafeTopCategory[];
  subcategories: SafeSubCategory[];
  priceRange: { min: number; max: number };
  currency: string;
  searchQuery: string;
}

interface UnifiedCategoryFilterProps {
  filters: UnifiedFilterState;
  onFiltersChange: (filters: UnifiedFilterState) => void;
  showPriceRange?: boolean;
  showCurrency?: boolean;
  showSearch?: boolean;
  compact?: boolean;
}

const UnifiedCategoryFilter: React.FC<UnifiedCategoryFilterProps> = ({
  filters,
  onFiltersChange,
  showPriceRange = true,
  showCurrency = true,
  showSearch = false,
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<SafeTopCategory>>(new Set());

  const toggleGender = (gender: SafeGender) => {
    const newGenders = filters.genders.includes(gender)
      ? filters.genders.filter(g => g !== gender)
      : [...filters.genders, gender];
    onFiltersChange({ ...filters, genders: newGenders });
  };

  const toggleCategory = (category: SafeTopCategory) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    
    // If deselecting a category, also deselect its subcategories
    let newSubcategories = filters.subcategories;
    if (filters.categories.includes(category)) {
      const categorySubcategories = CATEGORY_TREE[category];
      newSubcategories = filters.subcategories.filter(
        sub => !(categorySubcategories as readonly string[]).includes(sub as string)
      );
    }
    
    onFiltersChange({ 
      ...filters, 
      categories: newCategories, 
      subcategories: newSubcategories 
    });
  };

  const toggleSubcategory = (subcategory: SafeSubCategory) => {
    const newSubcategories = filters.subcategories.includes(subcategory)
      ? filters.subcategories.filter(s => s !== subcategory)
      : [...filters.subcategories, subcategory];
    onFiltersChange({ ...filters, subcategories: newSubcategories });
  };

  const toggleCategoryExpansion = (category: SafeTopCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const clearFilters = () => {
    onFiltersChange({
      genders: [],
      categories: [],
      subcategories: [],
      priceRange: { min: 0, max: 1000 },
      currency: 'USD',
      searchQuery: ''
    });
  };

  const getActiveFilterCount = () => {
    return filters.genders.length + 
           filters.categories.length + 
           filters.subcategories.length +
           (filters.priceRange.min > 0 || filters.priceRange.max < 1000 ? 1 : 0) +
           (filters.currency !== 'USD' ? 1 : 0) +
           (filters.searchQuery ? 1 : 0);
  };

  const activeFilterCount = getActiveFilterCount();

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {/* Active filters as removable badges - hidden on mobile for cleaner look */}
        <div className="hidden sm:flex flex-wrap gap-2">
          {filters.genders.map(gender => (
            <Badge key={gender} variant="secondary" className="cursor-pointer">
              {getGenderDisplayName(gender)}
              <X 
                className="h-3 w-3 ml-1" 
                onClick={() => toggleGender(gender)}
              />
            </Badge>
          ))}
          {filters.categories.map(category => (
            <Badge key={category} variant="secondary" className="cursor-pointer">
              {getCategoryDisplayName(category)}
              <X 
                className="h-3 w-3 ml-1" 
                onClick={() => toggleCategory(category)}
              />
            </Badge>
          ))}
          {filters.subcategories.map(subcategory => (
            <Badge key={subcategory} variant="secondary" className="cursor-pointer">
              {getSubcategoryDisplayName(subcategory)}
              <X 
                className="h-3 w-3 ml-1" 
                onClick={() => toggleSubcategory(subcategory)}
              />
            </Badge>
          ))}
        </div>
        
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 sm:h-9 px-3 sm:px-4 rounded-full border-border/60 bg-background hover:bg-muted/50 transition-colors"
            >
              <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="ml-1.5 text-xs sm:text-sm font-medium">Filters</span>
              {activeFilterCount > 0 && (
                <Badge variant="destructive" className="ml-1.5 h-4 w-4 sm:h-5 sm:w-5 rounded-full p-0 flex items-center justify-center text-[10px] sm:text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 max-h-96 overflow-y-auto" align="end">
            <FilterContent 
              filters={filters}
              onFiltersChange={onFiltersChange}
              toggleGender={toggleGender}
              toggleCategory={toggleCategory}
              toggleSubcategory={toggleSubcategory}
              toggleCategoryExpansion={toggleCategoryExpansion}
              expandedCategories={expandedCategories}
              clearFilters={clearFilters}
              activeFilterCount={activeFilterCount}
              showPriceRange={showPriceRange}
              showCurrency={showCurrency}
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="min-w-[200px] justify-between">
          <span>
            {activeFilterCount > 0 ? `${activeFilterCount} Filter${activeFilterCount > 1 ? 's' : ''}` : 'All Categories'}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-h-96 overflow-y-auto">
        <FilterContent 
          filters={filters}
          onFiltersChange={onFiltersChange}
          toggleGender={toggleGender}
          toggleCategory={toggleCategory}
          toggleSubcategory={toggleSubcategory}
          toggleCategoryExpansion={toggleCategoryExpansion}
          expandedCategories={expandedCategories}
          clearFilters={clearFilters}
          activeFilterCount={activeFilterCount}
          showPriceRange={showPriceRange}
          showCurrency={showCurrency}
        />
      </PopoverContent>
    </Popover>
  );
};

interface FilterContentProps {
  filters: UnifiedFilterState;
  onFiltersChange: (filters: UnifiedFilterState) => void;
  toggleGender: (gender: SafeGender) => void;
  toggleCategory: (category: SafeTopCategory) => void;
  toggleSubcategory: (subcategory: SafeSubCategory) => void;
  toggleCategoryExpansion: (category: SafeTopCategory) => void;
  expandedCategories: Set<SafeTopCategory>;
  clearFilters: () => void;
  activeFilterCount: number;
  showPriceRange: boolean;
  showCurrency: boolean;
}

const FilterContent: React.FC<FilterContentProps> = ({
  filters,
  onFiltersChange,
  toggleGender,
  toggleCategory,
  toggleSubcategory,
  toggleCategoryExpansion,
  expandedCategories,
  clearFilters,
  activeFilterCount,
  showPriceRange,
  showCurrency
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Filters</h4>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear All
          </Button>
        )}
      </div>

      {/* Gender Filters */}
      <div className="space-y-2">
        <h5 className="text-sm font-medium">Gender</h5>
        <div className="grid grid-cols-2 gap-2">
          {GENDER_OPTIONS.map(gender => (
            <div key={gender} className="flex items-center space-x-2">
              <Checkbox
                id={`gender-${gender}`}
                checked={filters.genders.includes(gender)}
                onCheckedChange={() => toggleGender(gender)}
              />
              <label
                htmlFor={`gender-${gender}`}
                className="text-sm cursor-pointer"
              >
                {getGenderDisplayName(gender)}
              </label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Category Filters */}
      <div className="space-y-2">
        <h5 className="text-sm font-medium">Categories</h5>
        <div className="space-y-1">
          {Object.keys(CATEGORY_TREE).map(category => {
            const topCategory = category as SafeTopCategory;
            const subcategories = CATEGORY_TREE[topCategory];
            const isExpanded = expandedCategories.has(topCategory);
            
            return (
              <div key={category} className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`category-${category}`}
                    checked={filters.categories.includes(topCategory)}
                    onCheckedChange={() => toggleCategory(topCategory)}
                  />
                  <Collapsible>
                    <CollapsibleTrigger
                      className="flex items-center space-x-1 text-sm cursor-pointer hover:text-primary"
                      onClick={() => toggleCategoryExpansion(topCategory)}
                    >
                      <span>{getCategoryDisplayName(topCategory)}</span>
                      <ChevronDown 
                        className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="ml-6 mt-1 space-y-1">
                      {subcategories.map(subcategory => (
                        <div key={subcategory} className="flex items-center space-x-2">
                          <Checkbox
                            id={`subcategory-${subcategory}`}
                            checked={filters.subcategories.includes(subcategory)}
                            onCheckedChange={() => toggleSubcategory(subcategory)}
                          />
                          <label
                            htmlFor={`subcategory-${subcategory}`}
                            className="text-xs cursor-pointer text-muted-foreground"
                          >
                            {getSubcategoryDisplayName(subcategory)}
                          </label>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Price Range - if enabled */}
      {showPriceRange && (
        <>
          <Separator />
          <div className="space-y-2">
            <h5 className="text-sm font-medium">Price Range</h5>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Min</label>
                <input
                  type="number"
                  min="0"
                  value={filters.priceRange.min || ''}
                  onChange={(e) => onFiltersChange({
                    ...filters,
                    priceRange: { ...filters.priceRange, min: Number(e.target.value) || 0 }
                  })}
                  className="w-full px-2 py-1 text-xs border rounded"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Max</label>
                <input
                  type="number"
                  min="0"
                  value={filters.priceRange.max || ''}
                  onChange={(e) => onFiltersChange({
                    ...filters,
                    priceRange: { ...filters.priceRange, max: Number(e.target.value) || 1000 }
                  })}
                  className="w-full px-2 py-1 text-xs border rounded"
                  placeholder="1000"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Currency - if enabled */}
      {showCurrency && (
        <>
          <Separator />
          <div className="space-y-2">
            <h5 className="text-sm font-medium">Currency</h5>
            <select
              value={filters.currency}
              onChange={(e) => onFiltersChange({ ...filters, currency: e.target.value })}
              className="w-full px-2 py-1 text-xs border rounded"
            >
              {SUPPORTED_CURRENCIES.map(currency => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} ({currency.symbol})
                </option>
              ))}
            </select>
          </div>
        </>
      )}
    </div>
  );
};

export default UnifiedCategoryFilter;