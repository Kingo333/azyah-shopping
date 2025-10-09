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
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t p-4 z-40">
      <div className="container max-w-6xl mx-auto">
        <div className="grid grid-cols-3 gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={onAddClothes}
            className="flex flex-col gap-2 h-20 md:h-16"
          >
            <Shirt className="w-6 h-6" />
            <span className="text-xs">Add Clothes</span>
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            onClick={onStickers}
            className="flex flex-col gap-2 h-20 md:h-16"
          >
            <Smile className="w-6 h-6" />
            <span className="text-xs">Stickers</span>
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            onClick={onBackground}
            className="flex flex-col gap-2 h-20 md:h-16"
          >
            <Droplet className="w-6 h-6" />
            <span className="text-xs">Background</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
