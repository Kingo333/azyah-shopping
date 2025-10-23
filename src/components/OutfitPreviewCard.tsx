import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Trash2 } from 'lucide-react';

interface OutfitPreviewCardProps {
  fit: any;
  onClick: () => void;
  onDelete?: (fitId: string) => void;
}

export const OutfitPreviewCard: React.FC<OutfitPreviewCardProps> = ({
  fit,
  onClick,
  onDelete,
}) => {
  return (
    <Card
      onClick={onClick}
      className="relative overflow-hidden cursor-pointer hover:shadow-lg transition-all group"
    >
      <div className="aspect-[3/4] bg-muted/30">
        {fit.image_preview ? (
          <img
            src={fit.image_preview}
            alt={fit.title || 'Outfit'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : fit.render_path ? (
          <img
            src={fit.render_path}
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

      {/* Delete Button */}
      {onDelete && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <Button
            variant="destructive"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(fit.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

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
