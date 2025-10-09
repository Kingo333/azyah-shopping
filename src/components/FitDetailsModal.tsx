import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, Share2, Flag, Copy, Download } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PublicFit {
  id: string;
  title: string | null;
  render_path: string | null;
  like_count: number;
  created_at: string;
  creator_username: string;
  creator_name: string | null;
  creator_avatar: string | null;
  canvas_json: any;
}

interface FitDetailsModalProps {
  fit: PublicFit | null;
  open: boolean;
  onClose: () => void;
  onUseThisFit: (fitId: string) => void;
}

export const FitDetailsModal: React.FC<FitDetailsModalProps> = ({
  fit,
  open,
  onClose,
  onUseThisFit,
}) => {
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [canAddItems, setCanAddItems] = useState(false);

  if (!fit) return null;

  const handleShare = async () => {
    if (navigator.share && fit.render_path) {
      try {
        await navigator.share({
          title: fit.title || 'Check out this fit!',
          text: `By @${fit.creator_username}`,
          url: window.location.href,
        });
      } catch (err) {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard');
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  const handleReport = async () => {
    try {
      const { error } = await supabase.functions.invoke('moderation-flag', {
        body: {
          target_type: 'fit',
          target_id: fit.id,
          reason: 'User reported via fit details'
        }
      });

      if (error) throw error;

      toast.success('Thank you for your report. We\'ll review it shortly.');
      setShowReportDialog(false);
    } catch (error) {
      toast.error('Failed to submit report');
    }
  };

  const handleAddItemsToCloset = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to add items');
        return;
      }

      // Fetch all fit_items and check permissions
      const { data: fitItems, error: fitItemsError } = await supabase
        .from('fit_items')
        .select(`
          *,
          wardrobe_item:wardrobe_items (
            id,
            image_url,
            image_bg_removed_url,
            category,
            color,
            brand,
            tags,
            public_reuse_permitted,
            user_id
          )
        `)
        .eq('fit_id', fit.id);

      if (fitItemsError) throw fitItemsError;
      if (!fitItems || fitItems.length === 0) {
        toast.error('No items found in this fit');
        return;
      }

      // Check if ALL items are reusable
      const allReusable = fitItems.every((item: any) => 
        item.wardrobe_item?.public_reuse_permitted === true
      );

      if (!allReusable) {
      toast.error("This item isn't reusable. Try other public items or upload your own.");
        return;
      }

      // Copy items with attribution
      const itemsToAdd = fitItems.map((item: any) => ({
        user_id: user.id,
        image_url: item.wardrobe_item.image_url,
        image_bg_removed_url: item.wardrobe_item.image_bg_removed_url,
        category: item.wardrobe_item.category,
        color: item.wardrobe_item.color,
        brand: item.wardrobe_item.brand,
        tags: item.wardrobe_item.tags,
        source: 'community_copy',
        public_reuse_permitted: false,
        attribution_user_id: item.wardrobe_item.user_id,
      }));

      const { error: insertError } = await supabase
        .from('wardrobe_items')
        .insert(itemsToAdd);

      if (insertError) throw insertError;

      toast.success(`Added ${itemsToAdd.length} items to your closet`);
      onClose();
    } catch (error) {
      console.error('Error adding items:', error);
      toast.error('Failed to add items to closet');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{fit.title || 'Fit'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Hero Image */}
          <div className="aspect-square rounded-lg bg-muted overflow-hidden">
            {fit.render_path ? (
              <img 
                src={fit.render_path}
                alt={fit.title || 'Fit'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                No preview available
              </div>
            )}
          </div>

          {/* Creator Info */}
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={fit.creator_avatar || undefined} />
              <AvatarFallback>{fit.creator_username[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{fit.creator_name || fit.creator_username}</p>
              <p className="text-sm text-muted-foreground">@{fit.creator_username}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              {fit.like_count} likes
            </span>
            <span>·</span>
            <span>{formatDistanceToNow(new Date(fit.created_at), { addSuffix: true })}</span>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <Button 
              className="w-full" 
              onClick={() => {
                onUseThisFit(fit.id);
                onClose();
              }}
            >
              <Copy className="w-4 h-4 mr-2" />
              Use this fit
            </Button>
            
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" onClick={handleAddItemsToCloset}>
                <Download className="w-4 h-4 mr-1" />
                Items
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-1" />
                Share
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowReportDialog(true)}>
                <Flag className="w-4 h-4 mr-1" />
                Report
              </Button>
            </div>
          </div>

          {/* Report Dialog */}
          {showReportDialog && (
            <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
              <p className="text-sm font-medium">Report this fit?</p>
              <p className="text-sm text-muted-foreground">
                This will flag the content for moderator review.
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowReportDialog(false)}>
                  Cancel
                </Button>
                <Button size="sm" variant="destructive" onClick={handleReport}>
                  Submit Report
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
