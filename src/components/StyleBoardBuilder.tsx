import React, { useState } from 'react';
import { useDefaultCloset } from '@/hooks/useDefaultCloset';
import { useEnhancedClosetItems, useAddExternalProduct } from '@/hooks/useEnhancedClosets';
import { useLooks, useCreateLook, useUpdateLook } from '@/hooks/useLooks';
import { useLikedProducts } from '@/hooks/useLikedProducts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { X, Plus, Palette, Sparkles, Heart } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface StyleBoardBuilderProps {
  onClose?: () => void;
}

const OUTFIT_TEMPLATES = [
  { id: 'casual', name: 'Casual Day', icon: '👕', description: 'Relaxed everyday style' },
  { id: 'formal', name: 'Formal', icon: '👔', description: 'Professional & elegant' },
  { id: 'party', name: 'Party', icon: '✨', description: 'Fun & festive' },
  { id: 'work', name: 'Work', icon: '💼', description: 'Office appropriate' },
  { id: 'sporty', name: 'Sporty', icon: '🏃', description: 'Active & comfortable' },
  { id: 'evening', name: 'Evening', icon: '🌙', description: 'Sophisticated night out' },
  { id: 'weekend', name: 'Weekend', icon: '🌈', description: 'Laid-back & fun' },
  { id: 'date_night', name: 'Date Night', icon: '💕', description: 'Romantic & stylish' }
];

export const StyleBoardBuilder: React.FC<StyleBoardBuilderProps> = ({ onClose }) => {
  const { defaultCloset } = useDefaultCloset();
  const { data: closetItems = [] } = useEnhancedClosetItems(defaultCloset?.id || '', 'all');
  const { data: looks = [] } = useLooks();
  const { likedProducts } = useLikedProducts();
  const createLookMutation = useCreateLook();
  const updateLookMutation = useUpdateLook();
  const addToWardrobeMutation = useAddExternalProduct();

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [lookTitle, setLookTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [addingToWardrobe, setAddingToWardrobe] = useState<Set<string>>(new Set());

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    setSelectedItems([]);
    const template = OUTFIT_TEMPLATES.find(t => t.id === templateId);
    setLookTitle(template?.name || '');
  };

  const handleItemSelect = (item: any) => {
    const isSelected = selectedItems.some(selected => selected.id === item.id);
    if (isSelected) {
      setSelectedItems(prev => prev.filter(selected => selected.id !== item.id));
    } else if (selectedItems.length < 6) { // Limit to 6 items
      setSelectedItems(prev => [...prev, item]);
    } else {
      toast({
        title: "Item limit reached",
        description: "You can add up to 6 items per outfit"
      });
    }
  };

  const handleCreateLook = async (saveAsDraft = false) => {
    if (!selectedTemplate || selectedItems.length === 0) {
      toast({
        title: "Missing items",
        description: "Please select a template and at least one item"
      });
      return;
    }

    setIsCreating(true);
    try {
      const canvas = {
        template: selectedTemplate,
        items: selectedItems.map((item, index) => ({
          id: item.id,
          title: item.title,
          image_url: item.image_url,
          position: { x: (index % 3) * 120, y: Math.floor(index / 3) * 150 },
          size: { width: 100, height: 130 }
        }))
      };

      await createLookMutation.mutateAsync({
        title: lookTitle || 'My Style',
        description: `Created with ${selectedTemplate} template`,
        canvas
      });

      toast({
        title: "Style created!",
        description: saveAsDraft ? "Your outfit has been saved as draft" : "Your outfit has been published to Mood Board"
      });

      // Reset form
      setSelectedTemplate(null);
      setSelectedItems([]);
      setLookTitle('');
      
      if (onClose) onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create style"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddToWardrobe = async (product: any) => {
    if (!defaultCloset?.id) {
      toast({
        title: "Error",
        description: "No default closet found"
      });
      return;
    }

    setAddingToWardrobe(prev => new Set([...prev, product.id]));

    try {
      await addToWardrobeMutation.mutateAsync({
        closetId: defaultCloset.id,
        productData: {
          external_product_id: product.id,
          title: product.title,
          brand: product.brands?.name,
          price_cents: product.price_cents,
          currency: product.currency,
          image_url: product.media_urls?.[0] || undefined,
          attrs: { 
            external_url: product.external_url,
            source: 'liked_products'
          }
        }
      });

      toast({
        title: "Added to wardrobe!",
        description: `${product.title} is now available for styling`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add item to your wardrobe"
      });
    } finally {
      setAddingToWardrobe(prev => {
        const newSet = new Set(prev);
        newSet.delete(product.id);
        return newSet;
      });
    }
  };

  const categorizedItems = closetItems.reduce((acc, item) => {
    const category = item.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  // Also categorize liked products for suggestions
  const likedItemsByCategory = likedProducts.reduce((acc, product) => {
    const category = 'liked_items';
    if (!acc[category]) acc[category] = [];
    acc[category].push({
      id: product.id,
      title: product.title,
      brand: product.brands?.name,
      image_url: product.media_urls?.[0],
      price_cents: product.price_cents,
      currency: product.currency,
      category: 'liked_items',
      isLikedProduct: true
    });
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Palette className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Style Board</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleCreateLook(true)}
                disabled={!selectedTemplate || selectedItems.length === 0 || isCreating}
                className="gap-2"
              >
                {isCreating ? 'Saving...' : 'Save as Draft'}
              </Button>
              <Button
                onClick={() => handleCreateLook(false)}
                disabled={!selectedTemplate || selectedItems.length === 0 || isCreating}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {isCreating ? 'Publishing...' : 'Publish to Mood Board'}
              </Button>
            </div>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Template Selection */}
        <section>
          <h2 className="text-lg font-medium mb-4">Choose Your Vibe</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {OUTFIT_TEMPLATES.map((template) => (
              <Card
                key={template.id}
                className={cn(
                  "p-4 cursor-pointer transition-all hover:scale-105",
                  selectedTemplate === template.id
                    ? "ring-2 ring-primary bg-primary/5"
                    : "hover:bg-muted/50"
                )}
                onClick={() => handleTemplateSelect(template.id)}
              >
                <div className="text-center space-y-2">
                  <div className="text-2xl">{template.icon}</div>
                  <div className="text-sm font-medium">{template.name}</div>
                  <div className="text-xs text-muted-foreground">{template.description}</div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Selected Items Preview */}
        {selectedItems.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">Your Outfit ({selectedItems.length}/6)</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedItems([])}
              >
                Clear All
              </Button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {selectedItems.map((item) => (
                <div key={item.id} className="relative flex-shrink-0">
                  <img
                    src={item.image_url || '/placeholder.svg'}
                    alt={item.title}
                    className="w-20 h-24 object-cover rounded-lg border"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={() => handleItemSelect(item)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Item Categories */}
        <section>
          <h2 className="text-lg font-medium mb-4">Add Items from Your Collection</h2>
          {closetItems.length === 0 && likedProducts.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="space-y-3">
                <div className="text-4xl">👗</div>
                <h3 className="text-lg font-medium">No items available</h3>
                <p className="text-muted-foreground">
                  Add items to your closet or like some products to start creating outfits
                </p>
                <Button className="gap-2" onClick={() => onClose && onClose()}>
                  <Plus className="h-4 w-4" />
                  Add Items
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Show liked products first if available */}
              {likedProducts.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="gap-1">
                      <Heart className="h-3 w-3 text-red-500" />
                      Liked Products
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {likedProducts.length} items • Add to wardrobe first
                    </span>
                  </div>
                   <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                     {likedProducts.slice(0, 12).map((product: any) => {
                       const isAdding = addingToWardrobe.has(product.id);
                       return (
                         <div
                           key={product.id}
                           className="relative cursor-pointer transition-all hover:scale-105"
                           onClick={() => handleAddToWardrobe(product)}
                         >
                           <img
                             src={product.media_urls?.[0] || '/placeholder.svg'}
                             alt={product.title}
                             className="w-full aspect-[3/4] object-cover rounded-lg"
                           />
                           <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
                             <div className="text-center text-white text-xs">
                               {isAdding ? (
                                 <div className="h-4 w-4 mx-auto mb-1 animate-spin rounded-full border border-white border-t-transparent" />
                               ) : (
                                 <Plus className="h-4 w-4 mx-auto mb-1" />
                               )}
                               {isAdding ? 'Adding...' : 'Add to Wardrobe'}
                             </div>
                           </div>
                         </div>
                       );
                     })}
                  </div>
                </div>
              )}

              {/* Wardrobe items */}
              {Object.entries(categorizedItems).map(([category, items]) => (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className="capitalize">
                      {category.replace('_', ' ')}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {items.length} items
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {items.map((item) => {
                      const isSelected = selectedItems.some(selected => selected.id === item.id);
                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "relative cursor-pointer transition-all hover:scale-105",
                            isSelected && "ring-2 ring-primary"
                          )}
                          onClick={() => handleItemSelect(item)}
                        >
                          <img
                            src={item.image_url || '/placeholder.svg'}
                            alt={item.title}
                            className="w-full aspect-[3/4] object-cover rounded-lg"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-primary/20 rounded-lg flex items-center justify-center">
                              <Heart className="h-6 w-6 text-primary fill-current" />
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 rounded-b-lg">
                            <div className="text-xs font-medium truncate">
                              {item.title}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};