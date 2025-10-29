import React from 'react';
import { Plus, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AddLayerButtonProps {
  availableCategories: Array<{
    value: string;
    label: string;
  }>;
  onAddLayer: (category: string) => void;
}

export const AddLayerButton: React.FC<AddLayerButtonProps> = ({
  availableCategories,
  onAddLayer,
}) => {
  if (availableCategories.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-medium hover:bg-accent/50 gap-0.5">
          <Layers className="w-3 h-3" />
          <Plus className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-background">
        {availableCategories.map((cat) => (
          <DropdownMenuItem
            key={cat.value}
            onClick={() => onAddLayer(cat.value)}
            className="cursor-pointer"
          >
            {cat.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
