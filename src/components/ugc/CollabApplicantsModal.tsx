import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCollabApplications, useAcceptApplicant, useUpdateApplication, useCollabCapacity } from '@/hooks/useCollaborations';
import { useToast } from '@/hooks/use-toast';
import { ApplicationStatus } from '@/types/ugc';
import { ExternalLink, Check, X, Clock, Users, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface CollabApplicantsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collabId: string;
}

export const CollabApplicantsModal: React.FC<CollabApplicantsModalProps> = ({
  open,
  onOpenChange,
  collabId
}) => {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: applications, isLoading } = useCollabApplications(collabId);
  const { data: capacity } = useCollabCapacity(collabId);
  const acceptApplicant = useAcceptApplicant();
  const updateApplication = useUpdateApplication();

  // Filter applications by status
  const pendingApps = applications?.filter(a => a.status === 'PENDING') || [];
  const acceptedApps = applications?.filter(a => a.status === 'ACCEPTED') || [];
  const waitlistedApps = applications?.filter(a => a.status === 'WAITLISTED') || [];
  const rejectedApps = applications?.filter(a => a.status === 'REJECTED') || [];

  const handleAccept = async (applicationId: string) => {
    try {
      await acceptApplicant.mutateAsync(applicationId);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleReject = async (applicationId: string) => {
    try {
      await updateApplication.mutateAsync({
        id: applicationId,
        updates: { status: 'REJECTED', note: rejectReason }
      });
      toast({
        title: "Application Rejected",
        description: "The creator has been notified of your decision."
      });
      setShowRejectModal(null);
      setRejectReason('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject application",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: ApplicationStatus) => {
    switch (status) {
      case 'ACCEPTED':
        return 'default';
      case 'REJECTED':
        return 'destructive';
      case 'PENDING':
        return 'secondary';
      case 'WAITLISTED':
        return 'outline';
      case 'WITHDRAWN':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status: ApplicationStatus) => {
    switch (status) {
      case 'ACCEPTED':
        return <Check className="h-3 w-3" />;
      case 'REJECTED':
        return <X className="h-3 w-3" />;
      case 'PENDING':
        return <Clock className="h-3 w-3" />;
      case 'WAITLISTED':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const renderSocialLinks = (socialLinks: Record<string, string>) => {
    return Object.entries(socialLinks).map(([platform, url]) => (
      <a
        key={platform}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        {platform}
        <ExternalLink className="h-3 w-3" />
      </a>
    ));
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Loading Applications...</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center text-muted-foreground">
            Loading applications...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const renderApplicationCard = (application: typeof applications[0], showActions = false) => (
    <Card key={application.id}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            <Avatar className="h-12 w-12">
              <AvatarImage src={application.users?.avatar_url} />
              <AvatarFallback>
                {application.users?.name?.charAt(0).toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{application.users?.name || 'Unknown'}</h3>
                  <p className="text-sm text-muted-foreground">
                    Applied on {format(new Date(application.created_at), 'MMM dd, yyyy')}
                  </p>
                </div>
                <Badge 
                  variant={getStatusColor(application.status)}
                  className="flex items-center gap-1"
                >
                  {getStatusIcon(application.status)}
                  {application.status}
                </Badge>
              </div>

              {/* Social Links */}
              <div>
                <h4 className="font-medium text-sm mb-2">Social Media Links</h4>
                <div className="flex flex-wrap gap-3">
                  {renderSocialLinks(application.social_links)}
                </div>
              </div>

              {/* Application Note */}
              {application.note && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Application Note</h4>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                    {application.note}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              {showActions && application.status === 'PENDING' && (
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => handleAccept(application.id)}
                    disabled={acceptApplicant.isPending || (capacity?.slots_remaining === 0)}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    {capacity?.slots_remaining === 0 ? 'Add to Waitlist' : 'Accept'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowRejectModal(application.id)}
                    disabled={acceptApplicant.isPending}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}

              {/* Waitlist action - can promote to accepted */}
              {showActions && application.status === 'WAITLISTED' && capacity?.slots_remaining && capacity.slots_remaining > 0 && (
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => handleAccept(application.id)}
                    disabled={acceptApplicant.isPending}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Accept from Waitlist
                  </Button>
                </div>
              )}

              {/* Review Details */}
              {(application.status === 'ACCEPTED' || application.status === 'REJECTED') && 
               application.reviewed_at && (
                <div className="text-sm text-muted-foreground pt-2">
                  {application.status} on {format(new Date(application.reviewed_at), 'MMM dd, yyyy')}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Collaboration Applications</DialogTitle>
              {capacity && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {capacity.slots_filled}/{capacity.slots_total || '∞'} slots filled
                  </span>
                  {capacity.waitlist_count > 0 && (
                    <Badge variant="outline">{capacity.waitlist_count} waitlisted</Badge>
                  )}
                </div>
              )}
            </div>
          </DialogHeader>

          {!applications || applications.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No applications yet
            </div>
          ) : (
            <Tabs defaultValue="pending" className="space-y-4">
              <TabsList>
                <TabsTrigger value="pending">
                  Pending ({pendingApps.length})
                </TabsTrigger>
                <TabsTrigger value="accepted">
                  Accepted ({acceptedApps.length})
                </TabsTrigger>
                <TabsTrigger value="waitlisted">
                  Waitlisted ({waitlistedApps.length})
                </TabsTrigger>
                <TabsTrigger value="rejected">
                  Rejected ({rejectedApps.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="space-y-4">
                {pendingApps.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">No pending applications</div>
                ) : (
                  pendingApps.map(app => renderApplicationCard(app, true))
                )}
              </TabsContent>

              <TabsContent value="accepted" className="space-y-4">
                {acceptedApps.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">No accepted applications</div>
                ) : (
                  acceptedApps.map(app => renderApplicationCard(app, false))
                )}
              </TabsContent>

              <TabsContent value="waitlisted" className="space-y-4">
                {waitlistedApps.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">No waitlisted applications</div>
                ) : (
                  waitlistedApps.map(app => renderApplicationCard(app, true))
                )}
              </TabsContent>

              <TabsContent value="rejected" className="space-y-4">
                {rejectedApps.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">No rejected applications</div>
                ) : (
                  rejectedApps.map(app => renderApplicationCard(app, false))
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={!!showRejectModal} onOpenChange={(open) => !open && setShowRejectModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason for rejection (optional)</label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Provide feedback to help the creator improve..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRejectModal(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => showRejectModal && handleReject(showRejectModal)}
                disabled={updateApplication.isPending}
              >
                Reject Application
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};