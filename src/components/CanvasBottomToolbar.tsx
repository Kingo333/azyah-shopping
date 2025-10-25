import React from 'react';
import { Button } from '@/components/ui/button';
import { Shirt, Smile, Droplet } from 'lucide-react';

interface CanvasBottomToolbarProps {
  onAddClothes: () => void;
  onStickers: () => void;
  onBackground: () => void;
}

export const CanvasBottomToolbar: React.FC<CanvasBottomToolbarProps> = ({
  onAddClothes,
  onStickers,
  onBackground,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t p-2 z-40" 
         style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}>
      <div className="container max-w-6xl mx-auto">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onAddClothes}
            className="flex flex-col gap-1 h-10 md:h-16"
          >
            <Shirt className="w-4 h-4 md:w-6 md:h-6" />
            <span className="text-[10px] md:text-xs">Add Clothes</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onBackground}
            className="flex flex-col gap-1 h-10 md:h-16"
          >
            <Droplet className="w-4 h-4 md:w-6 md:h-6" />
            <span className="text-[10px] md:text-xs">Background</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
