import React from 'react';
import { Card } from '@/components/ui/card';
import { Heart } from 'lucide-react';

interface OutfitPreviewCardProps {
  fit: any;
  onClick: () => void;
}

export const OutfitPreviewCard: React.FC<OutfitPreviewCardProps> = ({
  fit,
  onClick,
}) => {
  return (
    <Card
      onClick={onClick}
      className="relative overflow-hidden cursor-pointer hover:shadow-lg transition-all group"
    >
      <div className="aspect-[3/4] bg-muted/30">
        {fit.render_path ? (
          <img
            src={fit.render_path}
            alt={fit.title || 'Outfit'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : fit.image_preview ? (
          <img
            src={fit.image_preview}
            alt={fit.title || 'Outfit'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            No preview
          </div>
        )}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Info */}
      <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
        {fit.title && (
          <p className="text-sm font-medium truncate">{fit.title}</p>
        )}
        {fit.like_count > 0 && (
          <div className="flex items-center gap-1 text-xs mt-1">
            <Heart className="w-3 h-3 fill-current" />
            <span>{fit.like_count}</span>
          </div>
        )}
      </div>
    </Card>
  );
};
