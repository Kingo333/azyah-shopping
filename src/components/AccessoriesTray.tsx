import React from 'react';
import { WardrobeItem } from '@/hooks/useWardrobeItems';
import { Plus, ChevronUp } from 'lucide-react';
import { Button } from './ui/button';

interface AccessoriesTrayProps {
  items: WardrobeItem[];
  onPromote: (category: 'accessory' | 'bag') => void;
  onAddNew: (category: 'accessory' | 'bag') => void;
}

export const AccessoriesTray: React.FC<AccessoriesTrayProps> = ({
  items,
  onPromote,
  onAddNew,
}) => {
  const visibleItems = items.slice(0, 4);
  const overflowCount = Math.max(0, items.length - 4);

  if (items.length === 0) {
    return (
      <div 
        className="fixed right-4 z-40 bg-white rounded-2xl shadow-lg border p-3 space-y-2 w-20"
        style={{ 
          top: '50%', 
          transform: 'translateY(-50%)',
          paddingTop: 'env(safe-area-inset-top, 12px)',
        }}
      >
        <Button
          variant="ghost"
          size="icon"
          className="w-full h-10"
          onClick={() => onAddNew('accessory')}
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  return (
    <div 
      className="fixed right-4 z-40 bg-white rounded-2xl shadow-lg border p-3 space-y-2 w-20"
      style={{ 
        top: '50%', 
        transform: 'translateY(-50%)',
        paddingTop: 'env(safe-area-inset-top, 12px)',
      }}
    >
      {/* Thumbnails */}
      <div className="space-y-2">
        {visibleItems.map((item) => (
          <div
            key={item.id}
            className="w-14 h-14 rounded-lg overflow-hidden border-2 border-gray-100"
          >
            <img
              src={item.image_bg_removed_url || item.image_url}
              alt={item.category || 'Accessory'}
              className="w-full h-full object-contain"
            />
          </div>
        ))}

        {overflowCount > 0 && (
          <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
            +{overflowCount}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-1 pt-2 border-t">
        <Button
          variant="ghost"
          size="icon"
          className="w-full h-10"
          onClick={() => onPromote('accessory')}
          title="Promote to rail"
        >
          <ChevronUp className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="w-full h-10"
          onClick={() => onAddNew('accessory')}
          title="Add item"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
