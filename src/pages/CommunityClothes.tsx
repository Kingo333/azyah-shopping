import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePublicWardrobeItems } from '@/hooks/usePublicWardrobeItems';
import { CategoryFilterChips } from '@/components/CategoryFilterChips';
import { ClothingItemCard } from '@/components/ClothingItemCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export const CommunityClothes = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const navigate = useNavigate();

  const { data: items, isLoading } = usePublicWardrobeItems(selectedCategory);

  const handleItemClick = (itemId: string) => {
    navigate(`/community/item/${itemId}`);
  };

  return (
    <div className="space-y-6">
      <CategoryFilterChips
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-square w-full" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </Card>
          ))}
        </div>
      ) : !items || items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">No public items in this category</p>
          <p className="text-sm text-muted-foreground mt-2">
            Try selecting a different category
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {items.map((item) => (
            <ClothingItemCard
              key={item.id}
              item={item}
              onClick={() => handleItemClick(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
