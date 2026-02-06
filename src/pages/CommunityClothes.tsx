import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePublicWardrobeItems } from '@/hooks/usePublicWardrobeItems';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';
import { CategoryFilterChips } from '@/components/CategoryFilterChips';
import { ClothingItemCard } from '@/components/ClothingItemCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export const CommunityClothes = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const navigate = useNavigate();

  const { blockedIds } = useBlockedUsers();
  const { data: rawItems, isLoading } = usePublicWardrobeItems(selectedCategory);
  const items = useMemo(() => 
    (rawItems || []).filter(item => !blockedIds.includes(item.user_id)),
    [rawItems, blockedIds]
  );

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
        <div className="community-empty-state">
          <span className="text-5xl mb-3">👗</span>
          <p className="text-lg font-medium">No public items yet</p>
          <p className="text-sm text-muted-foreground mt-1">
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
