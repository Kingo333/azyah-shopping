import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

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
    <div className="outfit-card" onClick={onClick}>
      {/* Fixed 3:4 aspect ratio frame */}
      <div className="outfit-image-frame">
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
