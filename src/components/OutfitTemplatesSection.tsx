import React from 'react';
import { useLooks } from '@/hooks/useLooks';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Palette, Calendar, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OutfitTemplatesSectionProps {
  onCreateFromTemplate?: (lookId: string) => void;
  onOpenStyleBoard?: () => void;
}

export const OutfitTemplatesSection: React.FC<OutfitTemplatesSectionProps> = ({
  onCreateFromTemplate,
  onOpenStyleBoard
}) => {
  const { data: looks = [] } = useLooks();

  // Get saved looks (user's created outfits)
  const savedLooks = looks.filter(look => !look.is_public || look.is_public);
  const templateLooks: any[] = []; // Templates will be handled separately

  if (savedLooks.length === 0 && templateLooks.length === 0) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your Outfits</h2>
          <Button onClick={onOpenStyleBoard} className="gap-2">
            <Palette className="h-4 w-4" />
            Create Outfit
          </Button>
        </div>
        
        <Card className="p-8 text-center">
          <div className="space-y-3">
            <div className="text-4xl">✨</div>
            <h3 className="text-lg font-medium">No outfits yet</h3>
            <p className="text-muted-foreground">
              Start creating stylish outfit combinations from your wardrobe
            </p>
            <Button onClick={onOpenStyleBoard} className="gap-2">
              <Palette className="h-4 w-4" />
              Create Your First Outfit
            </Button>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Your Outfits</h2>
        <Button onClick={onOpenStyleBoard} className="gap-2">
          <Palette className="h-4 w-4" />
          Create New
        </Button>
      </div>

      {/* Saved Outfits */}
      {savedLooks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Calendar className="h-3 w-3" />
              Saved Outfits
            </Badge>
            <span className="text-sm text-muted-foreground">
              {savedLooks.length} outfit{savedLooks.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {savedLooks.slice(0, 8).map((look) => (
              <Card 
                key={look.id} 
                className="group cursor-pointer transition-all hover:shadow-md hover:scale-105"
                onClick={() => onCreateFromTemplate?.(look.id)}
              >
                <CardContent className="p-0">
                  <div className="aspect-[3/4] relative">
                    {look.cover_image_url ? (
                      <img
                        src={look.cover_image_url}
                        alt={look.title}
                        className="w-full h-full object-cover rounded-t-lg"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/5 to-primary/15 rounded-t-lg flex items-center justify-center">
                        <Palette className="h-8 w-8 text-primary/60" />
                      </div>
                    )}
                    
                    {look.is_public && (
                      <Badge 
                        variant="default" 
                        className="absolute top-2 right-2 text-xs"
                      >
                        <Users className="h-3 w-3 mr-1" />
                        Public
                      </Badge>
                    )}
                  </div>
                  
                  <div className="p-3">
                    <h4 className="font-medium text-sm truncate">{look.title}</h4>
                    {look.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {look.description}
                      </p>
                    )}
                    
                    {look.tags && look.tags.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {look.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                            {tag}
                          </Badge>
                        ))}
                        {look.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            +{look.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Template Outfits */}
      {templateLooks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Palette className="h-3 w-3" />
              Templates
            </Badge>
            <span className="text-sm text-muted-foreground">
              {templateLooks.length} template{templateLooks.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {templateLooks.map((template) => (
              <Card 
                key={template.id} 
                className="group cursor-pointer transition-all hover:shadow-md hover:scale-105 border-dashed"
                onClick={() => onCreateFromTemplate?.(template.id)}
              >
                <CardContent className="p-0">
                  <div className="aspect-[3/4] relative">
                    <div className="w-full h-full bg-gradient-to-br from-muted/50 to-muted/80 rounded-t-lg flex items-center justify-center">
                      <div className="text-center">
                        <Palette className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                        <Badge variant="secondary" className="text-xs">
                          TEMPLATE
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3">
                    <h4 className="font-medium text-sm truncate">{template.title}</h4>
                    {template.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {template.description}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};