import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Info } from 'lucide-react';
import { EnhancedClosetItem } from '@/hooks/useEnhancedClosets';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();
  const formatPrice = (cents?: number, currency = 'USD') => {
    if (!cents) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100);
  };

  return (
    <div className={`space-y-4 ${isMobile ? 'p-2' : 'p-4'}`}>
      {items.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">No items in this closet yet</p>
        </div>
      ) : (
        <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {items.map((item) => (
            <Card
              key={item.id}
              className={`group cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-200 border-0 bg-white/80 backdrop-blur-sm ${
                isMobile ? 'touch-manipulation' : ''
              }`}
              draggable
              onDragStart={(e) => onDragStart(item, e)}
              onClick={() => onItemClick(item)}
            >
              <div className={`relative overflow-hidden rounded-t-lg bg-gray-50 ${
                isMobile ? 'aspect-[4/3]' : 'aspect-square'
              }`}>
                <img
                  src={item.image_bg_removed_url || item.image_url || '/placeholder.svg'}
                  alt={item.title || 'Product'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
                
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className={`bg-white/90 backdrop-blur-sm rounded-full ${isMobile ? 'p-3' : 'p-2'}`}>
                    <Info className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
                  </div>
                </div>

                {/* Color dot */}
                {item.color && (
                  <div className={`absolute top-2 right-2`}>
                    <div 
                      className={`rounded-full border border-white/50 shadow-sm ${isMobile ? 'w-4 h-4' : 'w-3 h-3'}`}
                      style={{ backgroundColor: item.color.toLowerCase() }}
                    />
                  </div>
                )}
              </div>

              <div className={`space-y-2 ${isMobile ? 'p-4' : 'p-3'}`}>
                <div className="space-y-1">
                  <h4 className={`font-medium truncate text-foreground ${isMobile ? 'text-sm' : 'text-xs'}`}>
                    {item.title || 'Untitled Item'}
                  </h4>
                  
                  {item.brand && (
                    <p className={`text-muted-foreground truncate ${isMobile ? 'text-sm' : 'text-xs'}`}>
                      {item.brand}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  {item.price_cents && (
                    <span className={`font-medium text-primary ${isMobile ? 'text-sm' : 'text-xs'}`}>
                      {formatPrice(item.price_cents, item.currency)}
                    </span>
                  )}
                  
                  {item.category && (
                    <Badge variant="secondary" className={`${isMobile ? 'text-sm py-1 px-2' : 'text-xs py-0.5 px-1.5'}`}>
                      {isMobile ? item.category.slice(0, 8) : item.category}
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