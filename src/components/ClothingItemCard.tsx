import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PublicWardrobeItem } from '@/hooks/usePublicWardrobeItems';
import { useAuth } from '@/contexts/AuthContext';
import { Palette } from 'lucide-react';

interface ClothingItemCardProps {
  item: PublicWardrobeItem;
  onClick: () => void;
}

export const ClothingItemCard = ({ item, onClick }: ClothingItemCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const displayImage = item.image_bg_removed_url || item.image_url;
  const displayName = item.name || item.brand || 'Untitled Item';
  const username = item.user.username || item.user.name || 'Anonymous';
  const canStyle = user && user.id !== item.user_id;

  const handleStyleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/dress-me/canvas?mode=suggest&targetId=${item.user_id}`);
  };

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
        
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
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
          
          {canStyle && (
            <button
              className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center hover:bg-violet-600 transition-colors"
              onClick={handleStyleClick}
              title="Style this person"
            >
              <Palette className="w-3 h-3 text-white" />
            </button>
          )}
        </div>
      </div>
    </Card>
  );
};
