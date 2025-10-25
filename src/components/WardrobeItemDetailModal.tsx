import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { WardrobeItem } from '@/hooks/useWardrobeItems';
import { Sparkles, Loader2, CheckCircle } from 'lucide-react';
import { useEnhanceWardrobeItem } from '@/hooks/useEnhanceWardrobeItem';
import { useUserCredits } from '@/hooks/useUserCredits';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

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
  const [hasEnhanced, setHasEnhanced] = useState(false);

  if (!item) return null;

  const handleEnhance = async () => {
    // Check credits
    if (!credits || credits.credits_remaining < 20) {
      toast.error('You need at least 20 AI credits to enhance an item');
      return;
    }

    try {
      setHasEnhanced(false);
      await enhanceMutation.mutateAsync(item.id);
      setHasEnhanced(true);
      toast.success('Item enhanced successfully!');
      refetchCredits(); // Refresh credits after enhancement
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

          {/* Enhance Button */}
          <Button
            onClick={handleEnhance}
            disabled={enhanceMutation.isPending || (credits && credits.credits_remaining < 20)}
            className="w-full"
            size="lg"
            variant={hasEnhanced ? "outline" : "default"}
          >
            {hasEnhanced ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Done (Retry?)
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Enhance Item {credits && `(${credits.credits_remaining} credits)`}
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            {credits && credits.credits_remaining < 20 ? (
              <span className="text-destructive">Insufficient credits. Need 20 credits to enhance.</span>
            ) : (
              <>Our AI will convert your item to a professional ghost mannequin display. Costs 20 credits.</>
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
