import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Heart, MessageCircle, Plus } from 'lucide-react';
import { SmartImage } from '@/components/SmartImage';
import { Button } from '@/components/ui/button';
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
  const navigate = useNavigate();

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
      <div className="text-center py-8">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-medium mb-1">
          {searchQuery ? 'No outfits found' : 'No styled looks yet'}
        </h3>
        <p className="text-muted-foreground text-xs mb-3">
          {isOwner 
            ? "Create your first outfit in the canvas"
            : "Check back soon for styled looks"}
        </p>
        {isOwner && (
          <Button onClick={() => navigate('/dress-me')} size="sm" className="h-8 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Create Outfit
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {filteredOutfits.map((outfit) => {
        const image = getOutfitImage(outfit);
        
        return (
          <div
            key={outfit.id}
            className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group bg-muted"
            onClick={() => onOutfitClick(outfit)}
          >
            {/* Outfit Image */}
            {image ? (
              <SmartImage
                src={image}
                alt={outfit.title || 'Outfit'}
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-muted-foreground" />
              </div>
            )}

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <div className="flex items-center gap-1 text-white">
                <Heart className="h-4 w-4" />
                <span className="text-xs font-medium">{outfit.like_count || 0}</span>
              </div>
              <div className="flex items-center gap-1 text-white">
                <MessageCircle className="h-4 w-4" />
                <span className="text-xs font-medium">{outfit.comment_count || 0}</span>
              </div>
            </div>

            {/* Title overlay */}
            {outfit.title && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                <span className="text-white text-[10px] font-medium line-clamp-1">
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