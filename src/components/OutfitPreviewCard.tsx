import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Globe, Lock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface OutfitPreviewCardProps {
  fit: any;
  onClick: () => void;
  onDelete?: (fitId: string) => void;
  onTogglePublic?: (fitId: string, isPublic: boolean) => void;
  creator?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  showCreator?: boolean;
}

export const OutfitPreviewCard: React.FC<OutfitPreviewCardProps> = ({
  fit,
  onClick,
  onDelete,
  onTogglePublic,
  creator,
  showCreator,
}) => {
  return (
    <div className="outfit-card" onClick={onClick}>
      {/* Fixed 3:4 aspect ratio frame */}
      <div className="outfit-image-frame relative">
        {fit.render_path ? (
          <img
            src={fit.render_path}
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
                {(creator.username || 'U')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium">
              @{creator.username || 'Anonymous'}
            </span>
          </div>
        )}

        {/* Public/Private toggle button */}
        {onTogglePublic && (
          <button
            className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePublic(fit.id, !fit.is_public);
            }}
            title={fit.is_public ? 'Make private' : 'Make public'}
          >
            {fit.is_public ? (
              <Globe className="h-4 w-4 text-primary" />
            ) : (
              <Lock className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
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
