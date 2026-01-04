import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { WardrobeItem } from '@/hooks/useWardrobeItems';
import { Sparkles, Loader2, CheckCircle, ExternalLink } from 'lucide-react';
import { useEnhanceWardrobeItem } from '@/hooks/useEnhanceWardrobeItem';
import { useUserCredits } from '@/hooks/useUserCredits';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';

interface WardrobeItemDetailModalProps {
  item: WardrobeItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const WardrobeItemDetailModal: React.FC<WardrobeItemDetailModalProps> = ({
  item,
  isOpen,
  onClose,
}) => {
  const enhanceMutation = useEnhanceWardrobeItem();
  const { credits, refetch: refetchCredits } = useUserCredits();
  const [isPublic, setIsPublic] = useState(item?.public_reuse_permitted || false);
  const [isUpdating, setIsUpdating] = useState(false);

  if (!item) return null;

  const handleEnhance = async () => {
    // Check wardrobe credits
    if (!credits || credits.wardrobe_credits < 1) {
      toast.error('You need at least 1 wardrobe credit to enhance an item');
      return;
    }

    try {
      await enhanceMutation.mutateAsync(item.id);
      toast.success('Item enhanced successfully!');
      refetchCredits(); // Refresh credits after enhancement
      
      // Auto-close modal after successful enhancement
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to enhance item');
    }
  };

  const handleTogglePublic = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('wardrobe_items')
        .update({ public_reuse_permitted: !isPublic })
        .eq('id', item.id);
      
      if (error) throw error;
      
      setIsPublic(!isPublic);
      toast.success(
        !isPublic 
          ? 'Item is now public and visible in Community > Clothes' 
          : 'Item is now private. Removed from Community and other users\' wardrobes.'
      );
    } catch (error) {
      toast.error('Failed to update item visibility');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleShopItem = () => {
    if (item.source_url) {
      window.open(item.source_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Item Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Image Preview */}
          <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
            <img
              src={item.image_bg_removed_url || item.image_url}
              alt={item.category}
              className="w-full h-full object-contain"
            />
          </div>

          {/* Item Info */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Category</span>
              <span className="font-medium capitalize">{item.category}</span>
            </div>
            {item.color && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Color</span>
                <span className="font-medium capitalize">{item.color}</span>
              </div>
            )}
            {item.brand && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Brand</span>
                <span className="font-medium">{item.brand}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Uploaded</span>
              <span className="font-medium">
                {new Date(item.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Shop This Item Button */}
          {item.source_url && (
            <Button
              onClick={handleShopItem}
              variant="outline"
              className="w-full"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Shop This Item
            </Button>
          )}

          {/* Enhancement Status */}
          {enhanceMutation.isPending && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <p className="text-sm font-medium">Creating magic...</p>
              </div>
              <Progress value={33} className="h-2" />
              <p className="text-xs text-center text-muted-foreground italic">
                Wait a moment, it will be worth it ✨
              </p>
            </div>
          )}

          {/* Make Public Toggle */}
          <div className="flex justify-between items-center pt-3 border-t">
            <div className="space-y-1">
              <span className="text-sm font-medium">Make Public</span>
              <p className="text-xs text-muted-foreground">
                Share in Community &gt; Clothes
              </p>
            </div>
            <Switch 
              checked={isPublic}
              onCheckedChange={handleTogglePublic}
              disabled={isUpdating}
            />
          </div>

          {/* Enhance Button */}
          <Button
            onClick={handleEnhance}
            disabled={enhanceMutation.isPending || (credits && credits.wardrobe_credits < 1)}
            className="w-full"
            size="lg"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Enhance Item {credits && `(${credits.wardrobe_credits} credits)`}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            {credits && credits.wardrobe_credits < 1 ? (
              <span className="text-destructive">Insufficient credits. Need 1 wardrobe credit to enhance. Credits reset daily.</span>
            ) : (
              <>Our AI will convert your item to a professional ghost mannequin display. Costs 1 wardrobe credit.</>
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
