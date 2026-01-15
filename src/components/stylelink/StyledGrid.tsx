import React from 'react';
import { Sparkles, Heart, MessageCircle } from 'lucide-react';
import { SmartImage } from '@/components/SmartImage';
import { StyleLinkOutfit } from '@/hooks/useStyleLinkData';

interface StyledGridProps {
  outfits: StyleLinkOutfit[];
  isOwner: boolean;
  onOutfitClick: (outfit: StyleLinkOutfit) => void;
  searchQuery?: string;
}

const StyledGrid: React.FC<StyledGridProps> = ({ 
  outfits, 
  isOwner, 
  onOutfitClick,
  searchQuery 
}) => {
  // Filter outfits by search query
  const filteredOutfits = outfits.filter(outfit => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return outfit.title?.toLowerCase().includes(query) || false;
  });

  const getOutfitImage = (outfit: StyleLinkOutfit): string | null => {
    return outfit.image_preview || outfit.render_path || null;
  };

  if (filteredOutfits.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <Sparkles className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">
          {searchQuery ? 'No outfits found' : 'No styled looks yet'}
        </h3>
        <p className="text-muted-foreground text-sm">
          {isOwner 
            ? "Create your first outfit in the styling canvas!"
            : "Check back soon for styled looks."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {filteredOutfits.map((outfit) => {
        const image = getOutfitImage(outfit);
        
        return (
          <div
            key={outfit.id}
            className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group bg-muted"
            onClick={() => onOutfitClick(outfit)}
          >
            {/* Outfit Image */}
            {image ? (
              <SmartImage
                src={image}
                alt={outfit.title || 'Outfit'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-muted-foreground" />
              </div>
            )}

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
              <div className="flex items-center gap-1 text-white">
                <Heart className="h-5 w-5" />
                <span className="text-sm font-medium">{outfit.like_count || 0}</span>
              </div>
              <div className="flex items-center gap-1 text-white">
                <MessageCircle className="h-5 w-5" />
                <span className="text-sm font-medium">{outfit.comment_count || 0}</span>
              </div>
            </div>

            {/* Title overlay */}
            {outfit.title && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <span className="text-white text-xs font-medium line-clamp-1">
                  {outfit.title}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StyledGrid;
