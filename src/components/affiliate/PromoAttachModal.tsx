import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Check, AlertCircle, X } from 'lucide-react';
import {
  useMyOutfitsWithPromoStatus,
  useAttachPromoToOutfits,
  type AffiliatePromo,
} from '@/hooks/useAffiliatePromos';

interface PromoAttachModalProps {
  promo: AffiliatePromo;
  isOpen: boolean;
  onClose: () => void;
}

export function PromoAttachModal({ promo, isOpen, onClose }: PromoAttachModalProps) {
  const { data: outfits, isLoading } = useMyOutfitsWithPromoStatus();
  const attachPromo = useAttachPromoToOutfits();
  const [selectedOutfits, setSelectedOutfits] = useState<Set<string>>(new Set());

  const publicOutfits = outfits?.filter(o => o.is_public) || [];

  // Pre-select outfits already attached to this promo
  useEffect(() => {
    if (outfits) {
      const alreadyAttached = outfits
        .filter(o => o.attached_promo_id === promo.promo_id)
        .map(o => o.outfit_id);
      setSelectedOutfits(new Set(alreadyAttached));
    }
  }, [outfits, promo.promo_id]);

  const toggleOutfit = (outfitId: string) => {
    setSelectedOutfits(prev => {
      const next = new Set(prev);
      if (next.has(outfitId)) {
        next.delete(outfitId);
      } else {
        next.add(outfitId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    await attachPromo.mutateAsync({
      promo_id: promo.promo_id,
      outfit_ids: Array.from(selectedOutfits),
    });
    onClose();
  };

  const getOutfitImage = (preview: string | null) => {
    if (!preview) return '/placeholder.svg';
    if (preview.startsWith('http')) return preview;
    return `https://klwolsopucgswhtdlsps.supabase.co/storage/v1/object/public/outfit-renders/${preview}`;
  };

  // Get initial attached outfits for comparison
  const initialAttached = outfits
    ?.filter(o => o.attached_promo_id === promo.promo_id)
    .map(o => o.outfit_id) || [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">
            Attach "{promo.promo_name || promo.affiliate_code || 'Promo'}" to Outfits
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Tap once to select/unselect. Click Save to apply changes.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2">
          {isLoading ? (
            <div className="text-center text-sm text-muted-foreground py-8">Loading...</div>
          ) : publicOutfits.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No public outfits yet</p>
              <p className="text-xs text-muted-foreground mt-1">Make an outfit public to attach promos</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {publicOutfits.map((outfit) => {
                const isSelected = selectedOutfits.has(outfit.outfit_id);
                const wasAttached = initialAttached.includes(outfit.outfit_id);
                const hasOtherPromo = outfit.attached_promo_id && outfit.attached_promo_id !== promo.promo_id;
                const willBeUnattached = wasAttached && !isSelected;
                
                return (
                  <div
                    key={outfit.outfit_id}
                    className={`relative rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-[hsl(var(--azyah-maroon))] ring-2 ring-[hsl(var(--azyah-maroon))]/20' 
                        : willBeUnattached
                        ? 'border-destructive/50 bg-destructive/5'
                        : 'border-transparent hover:border-muted-foreground/30'
                    }`}
                    onClick={() => toggleOutfit(outfit.outfit_id)}
                  >
                    <div className="aspect-square bg-muted">
                      <img
                        src={getOutfitImage(outfit.image_preview)}
                        alt={outfit.title}
                        className={`w-full h-full object-cover ${willBeUnattached ? 'opacity-50' : ''}`}
                      />
                    </div>
                    
                    <div className="absolute top-2 left-2">
                      <Checkbox
                        checked={isSelected}
                        className="bg-background/80"
                      />
                    </div>
                    
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-[hsl(var(--azyah-maroon))] rounded-full p-0.5">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                    
                    {willBeUnattached && (
                      <div className="absolute top-2 right-2 bg-destructive rounded-full p-0.5">
                        <X className="h-3 w-3 text-white" />
                      </div>
                    )}
                    
                    {hasOtherPromo && (
                      <div className="absolute bottom-0 left-0 right-0 bg-amber-500/90 px-2 py-1">
                        <p className="text-[9px] text-white truncate">
                          Has: {outfit.attached_promo_name || 'Another promo'}
                        </p>
                      </div>
                    )}
                    
                    {willBeUnattached && !hasOtherPromo && (
                      <div className="absolute bottom-0 left-0 right-0 bg-destructive/90 px-2 py-1">
                        <p className="text-[9px] text-white truncate">
                          Will be un-attached
                        </p>
                      </div>
                    )}
                    
                    <div className="p-2 bg-background">
                      <p className="text-xs font-medium truncate">{outfit.title}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            className="flex-1 bg-[hsl(var(--azyah-maroon))] hover:bg-[hsl(var(--azyah-maroon))]/90"
            onClick={handleSave}
            disabled={attachPromo.isPending}
          >
            {attachPromo.isPending ? 'Saving...' : selectedOutfits.size === 0 ? 'Un-attach All' : `Save (${selectedOutfits.size} selected)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
