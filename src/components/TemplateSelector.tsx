import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Grid3X3, Sparkles } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
  preview: string;
  slots: any[];
}

interface TemplateSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelectTemplate: (template: Template) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  open,
  onClose,
  onSelectTemplate
}) => {
  const predefinedTemplates: Template[] = [
    {
      id: 'editorial-3up',
      name: 'Editorial 3-Up',
      description: 'Classic magazine layout with hero garment and accessories',
      preview: '/api/placeholder/300/200',
      slots: [
        {
          id: 'hero',
          x: 72, y: 96, w: 432, h: 600,
          type: 'tall', size: 'L', mask: 'rect', padding: 12
        },
        {
          id: 'acc1',
          x: 600, y: 160, w: 320, h: 200,
          type: 'wide', size: 'M', mask: 'rect', padding: 8
        },
        {
          id: 'acc2',
          x: 600, y: 400, w: 320, h: 200,
          type: 'wide', size: 'M', mask: 'rect', padding: 8
        }
      ]
    },
    {
      id: 'capsule-5',
      name: 'Capsule 5',
      description: 'Complete outfit with outerwear, top, bottom, bag, and shoes',
      preview: '/api/placeholder/300/200',
      slots: [
        {
          id: 'outerwear',
          x: 50, y: 50, w: 200, h: 300,
          type: 'tall', size: 'M', mask: 'rect', padding: 12
        },
        {
          id: 'top',
          x: 300, y: 80, w: 180, h: 220,
          type: 'square', size: 'M', mask: 'rect', padding: 10
        },
        {
          id: 'bottom',
          x: 520, y: 80, w: 180, h: 220,
          type: 'square', size: 'M', mask: 'rect', padding: 10
        },
        {
          id: 'bag',
          x: 750, y: 50, w: 200, h: 150,
          type: 'wide', size: 'S', mask: 'rect', padding: 8
        },
        {
          id: 'shoes',
          x: 750, y: 250, w: 200, h: 150,
          type: 'wide', size: 'S', mask: 'rect', padding: 8
        }
      ]
    },
    {
      id: 'abaya-set',
      name: 'Abaya Set',
      description: 'Modest wear collection with abaya, scarf, bag, and accessories',
      preview: '/api/placeholder/300/200',
      slots: [
        {
          id: 'abaya',
          x: 100, y: 50, w: 300, h: 500,
          type: 'tall', size: 'L', mask: 'rect', padding: 16
        },
        {
          id: 'scarf',
          x: 450, y: 80, w: 200, h: 120,
          type: 'wide', size: 'S', mask: 'rect', padding: 8
        },
        {
          id: 'bag',
          x: 450, y: 220, w: 200, h: 150,
          type: 'square', size: 'M', mask: 'rect', padding: 10
        },
        {
          id: 'jewelry',
          x: 450, y: 390, w: 200, h: 80,
          type: 'wide', size: 'S', mask: 'rect', padding: 6
        }
      ]
    },
    {
      id: 'accessories-rail',
      name: 'Accessories Rail',
      description: 'Horizontal showcase for jewelry, bags, and small accessories',
      preview: '/api/placeholder/300/200',
      slots: [
        {
          id: 'acc1',
          x: 80, y: 200, w: 150, h: 150,
          type: 'square', size: 'S', mask: 'circle', padding: 8
        },
        {
          id: 'acc2',
          x: 250, y: 200, w: 150, h: 150,
          type: 'square', size: 'S', mask: 'circle', padding: 8
        },
        {
          id: 'acc3',
          x: 420, y: 200, w: 150, h: 150,
          type: 'square', size: 'S', mask: 'circle', padding: 8
        },
        {
          id: 'acc4',
          x: 590, y: 200, w: 150, h: 150,
          type: 'square', size: 'S', mask: 'circle', padding: 8
        },
        {
          id: 'acc5',
          x: 760, y: 200, w: 150, h: 150,
          type: 'square', size: 'S', mask: 'circle', padding: 8
        }
      ]
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Choose a Template
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {predefinedTemplates.map((template) => (
            <Card 
              key={template.id} 
              className="p-4 cursor-pointer hover:shadow-lg transition-shadow group"
              onClick={() => onSelectTemplate(template)}
            >
              <div className="space-y-3">
                {/* Template preview */}
                <div className="aspect-[3/2] bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-200 group-hover:border-primary transition-colors">
                  <Grid3X3 className="h-8 w-8 text-gray-400 group-hover:text-primary transition-colors" />
                </div>

                {/* Template info */}
                <div>
                  <h3 className="font-medium text-sm">{template.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {template.description}
                  </p>
                </div>

                {/* Slot count */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {template.slots.length} slots
                  </span>
                  <Button size="sm" variant="outline" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    Use Template
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};