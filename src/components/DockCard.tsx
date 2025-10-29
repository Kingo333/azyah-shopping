import React from 'react';
import { WardrobeItem } from '@/hooks/useWardrobeItems';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DockCardProps {
  item: WardrobeItem;
  onTap: () => void;
  onRemove: () => void;
}

export const DockCard: React.FC<DockCardProps> = ({ item, onTap, onRemove }) => {
  return (
    <div className="dock-card relative group">
      <button
        onClick={onTap}
        className="w-16 h-16 bg-white rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center overflow-hidden border-2 border-border/50 hover:border-[#7A143E]/30"
      >
        <img
          src={item.image_bg_removed_url || item.image_url}
          alt={item.category}
          className="w-full h-full object-contain p-1"
          loading="lazy"
        />
      </button>
      <Button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        size="icon"
        variant="destructive"
        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
};
