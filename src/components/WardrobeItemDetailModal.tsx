import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { WardrobeItem } from '@/hooks/useWardrobeItems';
import { Sparkles, Loader2 } from 'lucide-react';
import { useEnhanceWardrobeItem } from '@/hooks/useEnhanceWardrobeItem';
import { toast } from 'sonner';

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

  if (!item) return null;

  const handleEnhance = async () => {
    try {
      await enhanceMutation.mutateAsync(item.id);
      toast.success('Item enhanced successfully!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to enhance item');
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
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Uploaded</span>
              <span className="font-medium">
                {new Date(item.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Enhance Button */}
          <Button
            onClick={handleEnhance}
            disabled={enhanceMutation.isPending}
            className="w-full"
            size="lg"
          >
            {enhanceMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enhancing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Enhance Item
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Our AI will convert your item to a professional ghost mannequin display
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
