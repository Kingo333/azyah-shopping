import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Info } from 'lucide-react';
import { EnhancedClosetItem } from '@/hooks/useEnhancedClosets';

interface ClosetGridProps {
  items: EnhancedClosetItem[];
  onDragStart: (item: EnhancedClosetItem, e: React.DragEvent) => void;
  onItemClick: (item: EnhancedClosetItem) => void;
}

export const ClosetGrid: React.FC<ClosetGridProps> = ({
  items,
  onDragStart,
  onItemClick
}) => {
  const formatPrice = (cents?: number, currency = 'USD') => {
    if (!cents) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100);
  };

  return (
    <div className="p-4 space-y-4">
      {items.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">No items in this closet yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => (
            <Card
              key={item.id}
              className="group cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-200 border-0 bg-white/80 backdrop-blur-sm"
              draggable
              onDragStart={(e) => onDragStart(item, e)}
              onClick={() => onItemClick(item)}
            >
              <div className="aspect-square relative overflow-hidden rounded-t-lg bg-gray-50">
                <img
                  src={item.image_bg_removed_url || item.image_url || '/placeholder.svg'}
                  alt={item.title || 'Product'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
                
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="bg-white/90 backdrop-blur-sm rounded-full p-2">
                    <Info className="h-4 w-4" />
                  </div>
                </div>

                {/* Color dot */}
                {item.color && (
                  <div className="absolute top-2 right-2">
                    <div 
                      className="w-3 h-3 rounded-full border border-white/50 shadow-sm"
                      style={{ backgroundColor: item.color.toLowerCase() }}
                    />
                  </div>
                )}
              </div>

              <div className="p-3 space-y-2">
                <div className="space-y-1">
                  <h4 className="text-xs font-medium truncate text-foreground">
                    {item.title || 'Untitled Item'}
                  </h4>
                  
                  {item.brand && (
                    <p className="text-xs text-muted-foreground truncate">
                      {item.brand}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  {item.price_cents && (
                    <span className="text-xs font-medium text-primary">
                      {formatPrice(item.price_cents, item.currency)}
                    </span>
                  )}
                  
                  {item.category && (
                    <Badge variant="secondary" className="text-xs py-0.5 px-1.5">
                      {item.category}
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};