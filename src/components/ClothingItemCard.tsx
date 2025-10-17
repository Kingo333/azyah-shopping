import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PublicWardrobeItem } from '@/hooks/usePublicWardrobeItems';

interface ClothingItemCardProps {
  item: PublicWardrobeItem;
  onClick: () => void;
}

export const ClothingItemCard = ({ item, onClick }: ClothingItemCardProps) => {
  const displayImage = item.image_bg_removed_url || item.image_url;
  const displayName = item.name || item.brand || 'Untitled Item';
  const username = item.user.username || item.user.name || 'Anonymous';

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-all"
      onClick={onClick}
    >
      <div className="aspect-square bg-muted flex items-center justify-center">
        {displayImage ? (
          <img
            src={displayImage}
            alt={displayName}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="text-muted-foreground text-sm">No image</div>
        )}
      </div>

      <div className="p-3">
        <p className="font-medium text-sm line-clamp-1">{displayName}</p>
        
        <div className="flex items-center gap-2 mt-2">
          <Avatar className="w-4 h-4">
            <AvatarImage src={item.user.avatar_url || undefined} />
            <AvatarFallback className="text-xs">
              {username[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground line-clamp-1">
            {username}
          </span>
        </div>
      </div>
    </Card>
  );
};
