import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingBag, Megaphone, Camera, Sparkles, Loader2, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

type BrandCategory = 'fashion_brand' | 'agency' | 'studio' | 'salon';

interface BrandCategoryChangeCardProps {
  brandId: string;
  currentCategory: string | null;
  brandCreatedAt: string;
  onCategoryChanged: (category: string) => void;
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
    icon: <ShoppingBag className="h-6 w-6" />
  },
  {
    value: 'agency',
    label: 'Marketing Agency',
    description: 'I provide marketing, growth, or creator services to brands',
    icon: <Megaphone className="h-6 w-6" />
  },
  {
    value: 'studio',
    label: 'Studio / Production',
    description: 'I provide content, photo/video, or production services',
    icon: <Camera className="h-6 w-6" />
  },
  {
    value: 'salon',
    label: 'Salon & Spa',
    description: 'I provide nail, hair, beauty, or spa services',
    icon: <Sparkles className="h-6 w-6" />
  }
];

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

export const BrandCategoryChangeCard: React.FC<BrandCategoryChangeCardProps> = ({
  brandId,
  currentCategory,
  brandCreatedAt,
  onCategoryChanged
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<BrandCategory | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Calculate if within 2 weeks and days remaining
  const { isWithinWindow, daysRemaining } = useMemo(() => {
    const createdDate = new Date(brandCreatedAt);
    const now = new Date();
    const elapsed = now.getTime() - createdDate.getTime();
    const remaining = TWO_WEEKS_MS - elapsed;
    
    return {
      isWithinWindow: remaining > 0,
      daysRemaining: Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)))
    };
  }, [brandCreatedAt]);

  // Don't render if outside the 2-week window
  if (!isWithinWindow) {
    return null;
  }

  const currentCategoryLabel = CATEGORY_OPTIONS.find(c => c.value === currentCategory)?.label || 'Not set';

  const handleOpenModal = () => {
    setSelectedCategory(currentCategory as BrandCategory);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedCategory || selectedCategory === currentCategory) {
      setIsModalOpen(false);
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
        title: 'Category updated',
        description: 'Your brand type has been changed successfully. The page will reload to apply changes.'
      });

      onCategoryChanged(selectedCategory);
      setIsModalOpen(false);
      
      // Reload to apply tab changes
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: 'Error',
        description: 'Failed to update category. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40">
              <RefreshCw className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-sm">Change Brand Type</h3>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/50 text-amber-700 dark:text-amber-400">
                  <Clock className="h-2.5 w-2.5 mr-1" />
                  {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Current: <span className="font-medium text-foreground">{currentCategoryLabel}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                You can change your brand type within the first 2 weeks. After that, this option will be locked.
              </p>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleOpenModal}
              className="flex-shrink-0"
            >
              Change
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Change Brand Type</DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              You have {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left to make changes
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            {CATEGORY_OPTIONS.map((option) => (
              <Card
                key={option.value}
                className={cn(
                  'cursor-pointer transition-all hover:border-primary/50',
                  selectedCategory === option.value 
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                    : 'border-border',
                  option.value === currentCategory && 'ring-1 ring-muted-foreground/20'
                )}
                onClick={() => setSelectedCategory(option.value)}
              >
                <CardContent className="flex items-center gap-3 p-3">
                  <div className={cn(
                    'flex-shrink-0 p-2 rounded-lg',
                    selectedCategory === option.value 
                      ? 'bg-primary/10 text-primary' 
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {option.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm">{option.label}</h3>
                      {option.value === currentCategory && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                  <div className={cn(
                    'w-4 h-4 rounded-full border-2 flex-shrink-0',
                    selectedCategory === option.value 
                      ? 'border-primary bg-primary' 
                      : 'border-muted-foreground/30'
                  )}>
                    {selectedCategory === option.value && (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button 
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!selectedCategory || selectedCategory === currentCategory || isSaving}
              className="min-w-[100px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
