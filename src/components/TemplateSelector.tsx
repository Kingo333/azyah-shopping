import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Grid3X3, Sparkles } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();
  
  // Scale template slots for mobile screens
  const scaleTemplate = (template: Template): Template => {
    const scale = isMobile ? 0.4 : 1; // Scale down to 40% on mobile
    const canvasScale = isMobile ? { width: 432, height: 576 } : { width: 1080, height: 1440 }; // Mobile canvas is smaller
    
    return {
      ...template,
      slots: template.slots.map(slot => ({
        ...slot,
        x: Math.round(slot.x * scale),
        y: Math.round(slot.y * scale),
        w: Math.round(slot.w * scale),
        h: Math.round(slot.h * scale),
        padding: Math.max(4, Math.round(slot.padding * scale))
      }))
    };
  };

  const baseTemplates: Template[] = [
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
      name: 'Outfit & Items',
      description: 'Complete outfit collection with main pieces and accessories',
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
      id: 'mobile-stack',
      name: 'Mobile Stack',
      description: 'Vertical layout optimized for mobile viewing',
      preview: '/api/placeholder/300/200',
      slots: [
        {
          id: 'main',
          x: 40, y: 40, w: 350, h: 200,
          type: 'wide', size: 'L', mask: 'rect', padding: 12
        },
        {
          id: 'acc1',
          x: 40, y: 260, w: 170, h: 120,
          type: 'square', size: 'M', mask: 'rect', padding: 8
        },
        {
          id: 'acc2',
          x: 220, y: 260, w: 170, h: 120,
          type: 'square', size: 'M', mask: 'rect', padding: 8
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

  // Show only "Outfit & Items" template
  const predefinedTemplates = [
    baseTemplates.find(t => t.id === 'abaya-set')
  ].filter(Boolean).map(scaleTemplate);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm md:max-w-4xl max-h-[80vh] overflow-auto mx-2">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base md:text-lg">
            <Sparkles className="h-4 w-4 md:h-5 md:w-5" />
            Choose a Template
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {predefinedTemplates.map((template) => (
            <Card 
              key={template.id} 
              className="p-4 cursor-pointer hover:shadow-lg transition-shadow group border-2 border-primary/20"
              onClick={() => onSelectTemplate(template)}
            >
              <div className="flex items-center gap-4">
                {/* Template preview */}
                <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg flex items-center justify-center border border-primary/30">
                  <Grid3X3 className="h-8 w-8 text-primary" />
                </div>

                {/* Template info */}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-primary">{template.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {template.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      {template.slots.length} slots
                    </span>
                    <span className="text-xs text-primary font-medium">Recommended</span>
                  </div>
                </div>

                <Button 
                  size="lg" 
                  className="shrink-0"
                >
                  Use Template
                </Button>
              </div>
            </Card>
          ))}

          <div className="text-center text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
            This template is perfect for creating complete outfit collections with main pieces and accessories.
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4 md:mt-6">
          <Button variant="outline" onClick={onClose} size="sm">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};