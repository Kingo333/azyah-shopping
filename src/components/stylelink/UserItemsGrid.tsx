import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Shirt, ShoppingBag } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface UserItemsGridProps {
  userId: string;
  isOwner: boolean;
  searchQuery?: string;
}

interface WardrobeItem {
  id: string;
  name: string | null;
  brand: string | null;
  category: string | null;
  image_url: string | null;
  image_bg_removed_url: string | null;
  created_at: string;
}

const UserItemsGrid: React.FC<UserItemsGridProps> = ({ userId, isOwner, searchQuery }) => {
  const navigate = useNavigate();

  // Fetch user's public wardrobe items
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['user-public-items', userId],
    queryFn: async (): Promise<WardrobeItem[]> => {
      const { data, error } = await supabase
        .from('wardrobe_items')
        .select('id, name, brand, category, image_url, image_bg_removed_url, created_at')
        .eq('user_id', userId)
        .eq('public_reuse_permitted', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WardrobeItem[];
    },
    enabled: !!userId,
  });

  // Filter items by search query
  const filteredItems = items.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.name?.toLowerCase().includes(query) ||
      item.brand?.toLowerCase().includes(query) ||
      item.category?.toLowerCase().includes(query)
    );
  });

  const handleItemClick = (itemId: string) => {
    navigate(`/community/item/${itemId}`);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-1.5">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-xl" />
        ))}
      </div>
    );
  }

  if (filteredItems.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
          <Shirt className="h-5 w-5 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-medium mb-1">
          {searchQuery ? 'No items found' : 'No public items yet'}
        </h3>
        <p className="text-muted-foreground text-xs">
          {isOwner 
            ? "Make items from your wardrobe public to share them"
            : "Check back soon for shared items"}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {filteredItems.map((item) => {
        const displayImage = item.image_bg_removed_url || item.image_url;
        const displayName = item.name || item.brand || 'Untitled Item';

        return (
          <Card
            key={item.id}
            className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group bg-muted"
            onClick={() => handleItemClick(item.id)}
          >
            {/* Item Image */}
            {displayImage ? (
              <img
                src={displayImage}
                alt={displayName}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ShoppingBag className="h-8 w-8 text-muted-foreground" />
              </div>
            )}

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2">
              <span className="text-white text-xs font-medium text-center line-clamp-2">
                {displayName}
              </span>
              {item.brand && item.name && (
                <span className="text-white/70 text-[10px] mt-0.5">{item.brand}</span>
              )}
            </div>

            {/* Category badge */}
            {item.category && (
              <div className="absolute top-1.5 right-1.5 bg-background/90 backdrop-blur-sm rounded-full px-1.5 py-0.5 text-[10px] font-medium shadow-sm capitalize">
                {item.category}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default UserItemsGrid;
