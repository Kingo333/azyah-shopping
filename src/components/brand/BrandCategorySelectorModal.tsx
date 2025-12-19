import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingBag, Megaphone, Camera, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type BrandCategory = 'fashion_brand' | 'agency' | 'studio';

interface BrandCategorySelectorModalProps {
  brandId: string;
  isOpen: boolean;
  onCategorySelected: (category: BrandCategory) => void;
}

const CATEGORY_OPTIONS: {
  value: BrandCategory;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'fashion_brand',
    label: 'Fashion Brand',
    description: 'I sell fashion, beauty, or lifestyle products',
    icon: <ShoppingBag className="h-8 w-8" />
  },
  {
    value: 'agency',
    label: 'Marketing Agency',
    description: 'I provide marketing, growth, or creator services to brands',
    icon: <Megaphone className="h-8 w-8" />
  },
  {
    value: 'studio',
    label: 'Studio / Production',
    description: 'I provide content, photo/video, or production services',
    icon: <Camera className="h-8 w-8" />
  }
];

export const BrandCategorySelectorModal: React.FC<BrandCategorySelectorModalProps> = ({
  brandId,
  isOpen,
  onCategorySelected
}) => {
  const [selectedCategory, setSelectedCategory] = useState<BrandCategory | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!selectedCategory) {
      toast({
        title: 'Please select a category',
        description: 'Choose what best describes your brand',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('brands')
        .update({ category: selectedCategory })
        .eq('id', brandId);

      if (error) throw error;

      toast({
        title: 'Category saved',
        description: 'Your brand type has been set successfully'
      });

      onCategorySelected(selectedCategory);
    } catch (error) {
      console.error('Error saving category:', error);
      toast({
        title: 'Error',
        description: 'Failed to save category. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">What best describes your brand?</DialogTitle>
          <DialogDescription>
            This helps us customize your portal experience. You can focus on selling products or offering services.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {CATEGORY_OPTIONS.map((option) => (
            <Card
              key={option.value}
              className={cn(
                'cursor-pointer transition-all hover:border-primary/50',
                selectedCategory === option.value 
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                  : 'border-border'
              )}
              onClick={() => setSelectedCategory(option.value)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className={cn(
                  'flex-shrink-0 p-3 rounded-lg',
                  selectedCategory === option.value 
                    ? 'bg-primary/10 text-primary' 
                    : 'bg-muted text-muted-foreground'
                )}>
                  {option.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{option.label}</h3>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 flex-shrink-0',
                  selectedCategory === option.value 
                    ? 'border-primary bg-primary' 
                    : 'border-muted-foreground/30'
                )}>
                  {selectedCategory === option.value && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-end">
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedCategory || isSaving}
            className="min-w-[120px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Continue'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
