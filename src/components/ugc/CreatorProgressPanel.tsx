import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCreatorDeliverables } from '@/hooks/useDeliverables';
import { useCreatorPayouts, useUpdatePayoutStatus } from '@/hooks/usePayouts';
import { Collaboration, CollabApplication, DeliverableStatus, PayoutStatus, PLATFORM_OPTIONS } from '@/types/ugc';
import { SubmitDeliverableModal } from './SubmitDeliverableModal';
import { 
  Upload, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  XCircle, 
  DollarSign,
  ExternalLink,
  Flag
} from 'lucide-react';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';

interface CreatorProgressPanelProps {
  collaboration: Collaboration;
  application: CollabApplication;
}

const getDeliverableStatusBadge = (status: DeliverableStatus) => {
  const configs: Record<DeliverableStatus, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: React.ReactNode; label: string }> = {
    submitted: { variant: 'secondary', icon: <Clock className="h-3 w-3" />, label: 'Under Review' },
    under_review: { variant: 'secondary', icon: <Clock className="h-3 w-3" />, label: 'Under Review' },
    approved: { variant: 'default', icon: <CheckCircle className="h-3 w-3" />, label: 'Approved' },
    revision_requested: { variant: 'outline', icon: <AlertCircle className="h-3 w-3" />, label: 'Revision Requested' },
    rejected: { variant: 'destructive', icon: <XCircle className="h-3 w-3" />, label: 'Rejected' }
  };
  
  const config = configs[status];
  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      {config.icon}
      {config.label}
    </Badge>
  );
};

const getPayoutStatusBadge = (status: PayoutStatus) => {
  const configs: Record<PayoutStatus, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
    pending_approval: { variant: 'secondary', label: 'Pending' },
    owed: { variant: 'outline', label: 'Owed' },
    hold: { variant: 'secondary', label: 'On Hold' },
    confirmed: { variant: 'default', label: 'Confirmed' },
    paid: { variant: 'default', label: 'Paid' },
    unpaid_issue: { variant: 'destructive', label: 'Issue Reported' }
  };
  
  const config = configs[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

export const CreatorProgressPanel: React.FC<CreatorProgressPanelProps> = ({
  collaboration,
  application
}) => {
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [unpaidReason, setUnpaidReason] = useState('');
  
  const { data: deliverables, isLoading: deliverablesLoading } = useCreatorDeliverables(collaboration.id);
  const { data: payouts, isLoading: payoutsLoading } = useCreatorPayouts(collaboration.id);
  const updatePayoutStatus = useUpdatePayoutStatus();

  const postsPerCreator = collaboration.posts_per_creator || 1;
  const submissionCount = deliverables?.length || 0;
  const canSubmitMore = submissionCount < postsPerCreator;

  const basePayout = collaboration.total_budget && collaboration.slots_total
    ? collaboration.total_budget / collaboration.slots_total
    : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: collaboration.currency || 'AED'
    }).format(amount);
  };

  const getPlatformIcon = (platform: string) => {
    return PLATFORM_OPTIONS.find(p => p.value === platform)?.icon || '📱';
  };

  const handleReportUnpaid = async (payoutId: string) => {
    if (!unpaidReason.trim()) return;
    
    await updatePayoutStatus.mutateAsync({
      payoutId,
      status: 'unpaid_issue',
      reason: unpaidReason.trim()
    });
    
    setUnpaidReason('');
  };

  if (deliverablesLoading || payoutsLoading) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          Loading your progress...
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Your Progress</span>
            {basePayout > 0 && (
              <Badge variant="outline" className="text-primary">
                <DollarSign className="h-3 w-3 mr-1" />
                {formatCurrency(basePayout)} / post
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Submission Status */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Posts Submitted</p>
              <p className="text-xs text-muted-foreground">
                {submissionCount} of {postsPerCreator} allowed
              </p>
            </div>
            {canSubmitMore && (
              <Button size="sm" onClick={() => setShowSubmitModal(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Submit Post
              </Button>
            )}
          </div>

          {/* Deliverables List */}
          {deliverables && deliverables.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <p className="text-sm font-medium">Your Submissions</p>
                {deliverables.map((deliverable) => {
                  const payout = payouts?.find(p => p.deliverable_id === deliverable.id);
                  
                  return (
                    <div key={deliverable.id} className="p-3 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>{getPlatformIcon(deliverable.platform)}</span>
                          <a 
                            href={deliverable.post_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            View Post
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        {getDeliverableStatusBadge(deliverable.status)}
                      </div>
                      
                      {deliverable.review_notes && (
                        <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                          Note: {deliverable.review_notes}
                        </p>
                      )}

                      {/* Payout Status */}
                      {payout && (
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {formatCurrency(payout.amount)}
                            </span>
                            {getPayoutStatusBadge(payout.status)}
                          </div>
                          
                          {/* Report Unpaid Issue */}
                          {payout.status === 'owed' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive">
                                  <Flag className="h-3 w-3 mr-1" />
                                  Report Issue
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Report Payment Issue</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Please describe the issue with your payment. This will be recorded 
                                    and may affect the brand's reputation.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <Textarea
                                  placeholder="Describe the issue (e.g., brand hasn't paid after 30 days)..."
                                  value={unpaidReason}
                                  onChange={(e) => setUnpaidReason(e.target.value)}
                                  className="min-h-[100px]"
                                />
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleReportUnpaid(payout.id)}
                                    disabled={!unpaidReason.trim() || updatePayoutStatus.isPending}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Report Issue
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Empty State */}
          {(!deliverables || deliverables.length === 0) && (
            <div className="text-center py-4">
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                You haven't submitted any posts yet.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Post about this collaboration and submit proof to get paid!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {showSubmitModal && (
        <SubmitDeliverableModal
          collaboration={collaboration}
          applicationId={application.id}
          open={showSubmitModal}
          onOpenChange={setShowSubmitModal}
        />
      )}
    </>
  );
};
