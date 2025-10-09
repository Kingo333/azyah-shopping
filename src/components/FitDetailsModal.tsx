import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, Share2, Flag, Copy } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';

interface PublicFit {
  id: string;
  title: string | null;
  render_path: string | null;
  like_count: number;
  created_at: string;
  creator_username: string;
  creator_name: string | null;
  creator_avatar: string | null;
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
        // Fallback to copy link
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
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              {fit.like_count} likes
            </span>
            <span>•</span>
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
            
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" onClick={() => setShowReportDialog(true)}>
                <Flag className="w-4 h-4 mr-2" />
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
