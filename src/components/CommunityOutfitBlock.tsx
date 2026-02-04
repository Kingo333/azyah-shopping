import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SmartImage } from '@/components/SmartImage';
import { ArrowRight, Shirt, Eye } from 'lucide-react';

interface CommunityOutfit {
  id: string;
  name?: string;
  image_url?: string;
  user?: {
    name?: string;
    avatar_url?: string;
  };
}

interface CommunityOutfitBlockProps {
  outfits: CommunityOutfit[];
}

export const CommunityOutfitBlock: React.FC<CommunityOutfitBlockProps> = ({ outfits }) => {
  const navigate = useNavigate();

  if (outfits.length === 0) return null;

  return (
    <section className="col-span-full py-4 my-2">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-serif font-medium text-foreground">Community Outfits</h3>
        <Button 
          variant="link" 
          size="sm" 
          onClick={() => navigate('/community')}
          className="text-[hsl(var(--azyah-maroon))] hover:text-[hsl(var(--azyah-maroon))]/80 text-xs p-0 h-auto gap-1"
        >
          Explore
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
      
      {/* 2-column grid layout to match masonry width */}
      <div className="grid grid-cols-2 gap-3 px-1">
        {outfits.slice(0, 2).map((outfit) => (
          <CommunityOutfitCard
            key={outfit.id}
            outfit={outfit}
            onViewOutfit={() => navigate(`/community/outfit/${outfit.id}`)}
            onGoToWardrobe={() => navigate('/dress-me')}
          />
        ))}
      </div>
    </section>
  );
};

interface CommunityOutfitCardProps {
  outfit: CommunityOutfit;
  onViewOutfit: () => void;
  onGoToWardrobe: () => void;
}

const CommunityOutfitCard: React.FC<CommunityOutfitCardProps> = ({
  outfit,
  onViewOutfit,
  onGoToWardrobe,
}) => {
  const userName = outfit.user?.name || 'User';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="w-full">
      <div 
        className="relative aspect-[3/4] rounded-xl overflow-hidden bg-muted border border-border shadow-sm cursor-pointer group"
        onClick={onViewOutfit}
      >
        {outfit.image_url ? (
          <SmartImage
            src={outfit.image_url}
            alt={outfit.name || 'Outfit'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/10 flex items-center justify-center">
            <Shirt className="h-8 w-8 text-muted-foreground/50" />
          </div>
        )}
        
        {/* User avatar badge */}
        <div className="absolute bottom-2 left-2">
          <Avatar className="h-7 w-7 border-2 border-white shadow-sm">
            <AvatarImage src={outfit.user?.avatar_url} />
            <AvatarFallback className="text-xs bg-[hsl(var(--azyah-maroon))] text-white">
              {userInitial}
            </AvatarFallback>
          </Avatar>
        </div>
        
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      
      {/* Action buttons */}
      <div className="flex gap-2 mt-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs px-2 gap-1"
          onClick={(e) => {
            e.stopPropagation();
            onViewOutfit();
          }}
        >
          <Eye className="h-3 w-3" />
          View
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs px-2 gap-1"
          onClick={(e) => {
            e.stopPropagation();
            onGoToWardrobe();
          }}
        >
          <Shirt className="h-3 w-3" />
          Wardrobe
        </Button>
      </div>
    </div>
  );
};

export default CommunityOutfitBlock;
