import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDeliverables, useReviewDeliverable } from '@/hooks/useDeliverables';
import { ExternalLink, Image, Check, X, MessageSquare, Clock, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { DeliverableStatus } from '@/types/ugc';

interface DeliverableReviewQueueProps {
  ownerOrgId: string;
  collabFilter?: string;
}

export const DeliverableReviewQueue: React.FC<DeliverableReviewQueueProps> = ({
  ownerOrgId,
  collabFilter
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedDeliverable, setSelectedDeliverable] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [loadingScreenshot, setLoadingScreenshot] = useState(false);

  const { data: deliverables, isLoading } = useDeliverables(undefined, collabFilter);
  const reviewDeliverable = useReviewDeliverable();

  // Filter deliverables by status
  const filteredDeliverables = deliverables?.filter(d => {
    if (statusFilter === 'pending') {
      return d.status === 'submitted' || d.status === 'under_review';
    }
    return d.status === statusFilter;
  }) || [];

  const getStatusBadge = (status: DeliverableStatus) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Submitted</Badge>;
      case 'under_review':
        return <Badge variant="outline"><Eye className="h-3 w-3 mr-1" /> Under Review</Badge>;
      case 'approved':
        return <Badge variant="default"><Check className="h-3 w-3 mr-1" /> Approved</Badge>;
      case 'revision_requested':
        return <Badge variant="outline"><MessageSquare className="h-3 w-3 mr-1" /> Revision</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const loadScreenshot = async (deliverableId: string, screenshotPath: string) => {
    setLoadingScreenshot(true);
    try {
      // Get signed URL via RPC
      const { data, error } = await supabase.rpc('get_deliverable_screenshot_path', {
        p_deliverable_id: deliverableId
      });

      if (error) throw error;

      if (data) {
        // Generate signed URL for the path
        const { data: signedData, error: signedError } = await supabase.storage
          .from('deliverable-screenshots')
          .createSignedUrl(data, 3600); // 1 hour expiry

        if (signedError) throw signedError;
        setScreenshotUrl(signedData?.signedUrl || null);
      }
    } catch (err) {
      console.error('Failed to load screenshot:', err);
      setScreenshotUrl(null);
    } finally {
      setLoadingScreenshot(false);
    }
  };

  const openReviewModal = async (deliverable: any) => {
    setSelectedDeliverable(deliverable);
    setReviewNotes('');
    setScreenshotUrl(null);
    setReviewModalOpen(true);
    
    if (deliverable.screenshot_path) {
      await loadScreenshot(deliverable.id, deliverable.screenshot_path);
    }
  };

  const handleReview = async (action: 'approve' | 'revision_requested' | 'reject') => {
    if (!selectedDeliverable) return;

    try {
      await reviewDeliverable.mutateAsync({
        deliverableId: selectedDeliverable.id,
        action,
        notes: reviewNotes || undefined
      });
      setReviewModalOpen(false);
      setSelectedDeliverable(null);
    } catch (error) {
      // Error handled by hook
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading deliverables...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="revision_requested">Revision Requested</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {filteredDeliverables.length} deliverable(s)
        </span>
      </div>

      {/* Deliverables List */}
      {filteredDeliverables.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No deliverables to review
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredDeliverables.map((deliverable) => (
            <Card key={deliverable.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {deliverable.creator_id?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{deliverable.platform}</Badge>
                        {getStatusBadge(deliverable.status)}
                      </div>
                      <a
                        href={deliverable.post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        View Post <ExternalLink className="h-3 w-3" />
                      </a>
                      <p className="text-xs text-muted-foreground">
                        Submitted {format(new Date(deliverable.created_at), 'MMM dd, yyyy HH:mm')}
                      </p>
                      {deliverable.review_notes && (
                        <p className="text-sm text-muted-foreground bg-muted p-2 rounded mt-2">
                          <strong>Review notes:</strong> {deliverable.review_notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openReviewModal(deliverable)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Modal */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Deliverable</DialogTitle>
          </DialogHeader>

          {selectedDeliverable && (
            <div className="space-y-4">
              {/* Post Link */}
              <div>
                <Label>Post URL</Label>
                <a
                  href={selectedDeliverable.post_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline mt-1"
                >
                  {selectedDeliverable.post_url} <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* Screenshot Preview */}
              <div>
                <Label>Screenshot</Label>
                <div className="mt-2 border rounded-lg overflow-hidden bg-muted">
                  {loadingScreenshot ? (
                    <div className="h-64 flex items-center justify-center">
                      <span className="text-muted-foreground">Loading screenshot...</span>
                    </div>
                  ) : screenshotUrl ? (
                    <img
                      src={screenshotUrl}
                      alt="Deliverable screenshot"
                      className="max-h-96 w-full object-contain"
                    />
                  ) : (
                    <div className="h-64 flex items-center justify-center">
                      <span className="text-muted-foreground">Screenshot not available</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Review Notes */}
              <div>
                <Label htmlFor="review_notes">Review Notes (Optional)</Label>
                <Textarea
                  id="review_notes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add feedback for the creator..."
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => handleReview('revision_requested')}
                  disabled={reviewDeliverable.isPending}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Request Revision
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleReview('reject')}
                  disabled={reviewDeliverable.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleReview('approve')}
                  disabled={reviewDeliverable.isPending}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
