import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Globe } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getDisplayName, getDisplayNameInitial } from '@/utils/userDisplayName';

interface OutfitPreviewCardProps {
  fit: any;
  onClick: () => void;
  onDelete?: (fitId: string) => void;
  creator?: {
    id: string;
    username: string;
    name?: string | null;
    avatar_url: string | null;
  };
  showCreator?: boolean;
}

export const OutfitPreviewCard: React.FC<OutfitPreviewCardProps> = ({
  fit,
  onClick,
  onDelete,
  creator,
  showCreator,
}) => {
  return (
    <div className="outfit-card" onClick={onClick}>
      {/* Fixed 3:4 aspect ratio frame */}
      <div className="outfit-image-frame relative">
        {(fit.render_path || fit.image_preview) ? (
          <img
            src={fit.render_path || fit.image_preview}
            alt={fit.title || 'Outfit'}
            className="outfit-image"
            loading="lazy"
          />
        ) : (
          <div className="outfit-placeholder">No preview</div>
        )}

        {/* Creator badge overlay */}
        {showCreator && creator && (
          <div className="outfit-user-badge">
            <Avatar className="w-5 h-5">
              <AvatarImage src={creator.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {getDisplayNameInitial(creator)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium">
              {getDisplayName(creator)}
            </span>
          </div>
        )}

        {/* Public status indicator - bottom right, non-interactive */}
        {fit.is_public && (
          <div 
            className="absolute bottom-2 right-2 z-10 p-1 rounded-full bg-background/80 backdrop-blur-sm"
            title="Public outfit"
          >
            <Globe className="h-3 w-3 text-primary" />
          </div>
        )}
      </div>

      {/* Delete button - appears on hover */}
      {onDelete && (
        <div className="outfit-delete-btn">
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

      {/* Optional meta row */}
      {fit.occasion && (
        <div className="outfit-meta">
          <span className="meta-chip">{fit.occasion}</span>
        </div>
      )}
    </div>
  );
};
