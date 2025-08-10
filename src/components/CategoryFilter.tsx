
import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Filter } from 'lucide-react';
import { getTopCategories, getSubcategories, getCatLabel, getSubcatLabel, type CatId, type SubcatId } from '@/lib/taxonomy';

interface CategoryFilterProps {
  selectedCategories: CatId[];
  selectedSubcategories: SubcatId[];
  onCategoryChange: (categories: CatId[]) => void;
  onSubcategoryChange: (subcategories: SubcatId[]) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategories,
  selectedSubcategories,
  onCategoryChange,
  onSubcategoryChange,
}) => {
  const handleCategoryToggle = (category: CatId) => {
    if (selectedCategories.includes(category)) {
      // Remove category and all its subcategories
      onCategoryChange(selectedCategories.filter(c => c !== category));
      const categorySubcategories = getSubcategories(category).map(s => s.id as SubcatId);
      const newSubcategories = selectedSubcategories.filter(
        sub => !categorySubcategories.includes(sub)
      );
      onSubcategoryChange(newSubcategories);
    } else {
      // Add category
      onCategoryChange([...selectedCategories, category]);
    }
  };

  const handleSubcategoryToggle = (subcategory: SubcatId) => {
    if (selectedSubcategories.includes(subcategory)) {
      onSubcategoryChange(selectedSubcategories.filter(s => s !== subcategory));
    } else {
      onSubcategoryChange([...selectedSubcategories, subcategory]);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80">
        <SheetHeader>
          <SheetTitle>Filter by Category</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-full mt-6">
          <div className="space-y-0">
            {getTopCategories().map((cat) => (
              <div key={cat.id} className="p-4 border-b last:border-b-0">
                <div className="flex items-center space-x-2 mb-2">
                  <Checkbox
                    id={cat.id}
                    checked={selectedCategories.includes(cat.id)}
                    onCheckedChange={() => handleCategoryToggle(cat.id)}
                  />
                  <label
                    htmlFor={cat.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {getCatLabel(cat.id)}
                  </label>
                </div>
                {selectedCategories.includes(cat.id) && cat.sub && cat.sub.length > 0 && (
                  <div className="ml-6 space-y-2">
                    {getSubcategories(cat.id).map((subcategory) => (
                      <div key={subcategory.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={subcategory.id}
                          checked={selectedSubcategories.includes(subcategory.id as SubcatId)}
                          onCheckedChange={() => handleSubcategoryToggle(subcategory.id as SubcatId)}
                        />
                        <label
                          htmlFor={subcategory.id}
                          className="text-xs leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {getSubcatLabel(subcategory.id as SubcatId)}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default CategoryFilter;
