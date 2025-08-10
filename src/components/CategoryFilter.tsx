import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Filter, X } from 'lucide-react';
import { CATEGORY_TREE, getAllCategories, getSubcategoriesForCategory, getCategoryDisplayName, getSubcategoryDisplayName } from '@/lib/categories';
import type { TopCategory, SubCategory } from '@/lib/categories';

interface CategoryFilterProps {
  selectedCategories: TopCategory[];
  selectedSubcategories: SubCategory[];
  onCategoryChange: (categories: TopCategory[]) => void;
  onSubcategoryChange: (subcategories: SubCategory[]) => void;
  className?: string;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategories,
  selectedSubcategories,
  onCategoryChange,
  onSubcategoryChange,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleCategoryToggle = (category: TopCategory) => {
    const newCategories = selectedCategories.includes(category)
      ? selectedCategories.filter(c => c !== category)
      : [...selectedCategories, category];
    
    onCategoryChange(newCategories);
    
    // Remove subcategories that belong to unselected categories
    if (!newCategories.includes(category)) {
      const categorySubcategories = getSubcategoriesForCategory(category);
      const newSubcategories = selectedSubcategories.filter(
        sub => !categorySubcategories.includes(sub)
      );
      onSubcategoryChange(newSubcategories);
    }
  };
  
  const handleSubcategoryToggle = (subcategory: SubCategory) => {
    const newSubcategories = selectedSubcategories.includes(subcategory)
      ? selectedSubcategories.filter(s => s !== subcategory)
      : [...selectedSubcategories, subcategory];
    
    onSubcategoryChange(newSubcategories);
  };
  
  const clearFilters = () => {
    onCategoryChange([]);
    onSubcategoryChange([]);
  };
  
  const activeFiltersCount = selectedCategories.length + selectedSubcategories.length;
  
  return (
    <div className={className}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="relative">
            <Filter className="h-4 w-4 mr-2" />
            Categories
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filter by Category</h4>
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear all
                </Button>
              )}
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {getAllCategories().map((category) => (
              <div key={category} className="p-4 border-b last:border-b-0">
                <div className="flex items-center space-x-2 mb-2">
                  <Checkbox
                    id={category}
                    checked={selectedCategories.includes(category)}
                    onCheckedChange={() => handleCategoryToggle(category)}
                  />
                  <label
                    htmlFor={category}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {getCategoryDisplayName(category)}
                  </label>
                </div>
                
                {selectedCategories.includes(category) && (
                  <div className="ml-6 space-y-2">
                    {getSubcategoriesForCategory(category).map((subcategory) => (
                      <div key={subcategory} className="flex items-center space-x-2">
                        <Checkbox
                          id={subcategory}
                          checked={selectedSubcategories.includes(subcategory)}
                          onCheckedChange={() => handleSubcategoryToggle(subcategory)}
                        />
                        <label
                          htmlFor={subcategory}
                          className="text-xs leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {getSubcategoryDisplayName(subcategory)}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      
      {/* Active filters display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedCategories.map((category) => (
            <Badge key={category} variant="secondary" className="text-xs">
              {getCategoryDisplayName(category)}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 ml-1"
                onClick={() => handleCategoryToggle(category)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
          {selectedSubcategories.map((subcategory) => (
            <Badge key={subcategory} variant="outline" className="text-xs">
              {getSubcategoryDisplayName(subcategory)}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 ml-1"
                onClick={() => handleSubcategoryToggle(subcategory)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoryFilter;