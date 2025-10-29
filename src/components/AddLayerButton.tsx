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
        <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs font-medium hover:bg-accent/50">
          <Plus className="w-3.5 h-3.5" />
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
