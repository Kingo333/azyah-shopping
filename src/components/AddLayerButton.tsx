import React from 'react';
import { Plus } from 'lucide-react';
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
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Add Layer
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
