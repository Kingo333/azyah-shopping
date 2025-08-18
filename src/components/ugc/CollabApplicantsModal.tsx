import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { useCollabApplications, useUpdateApplication } from '@/hooks/useCollaborations';
import { useToast } from '@/hooks/use-toast';
import { ApplicationStatus } from '@/types/ugc';
import { ExternalLink, MessageSquare, Check, X, Clock } from 'lucide-react';
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
  const updateApplication = useUpdateApplication();

  const handleAccept = async (applicationId: string) => {
    try {
      await updateApplication.mutateAsync({
        id: applicationId,
        updates: { status: 'ACCEPTED' }
      });
      toast({
        title: "Application Accepted",
        description: "The creator has been notified of your decision."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to accept application",
        variant: "destructive"
      });
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Collaboration Applications</DialogTitle>
          </DialogHeader>

          {!applications || applications.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No applications yet
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((application) => (
                <Card key={application.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={application.users?.avatar_url} />
                          <AvatarFallback>
                            {application.users?.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold">{application.users?.name}</h3>
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
                          {application.status === 'PENDING' && (
                            <div className="flex items-center gap-2 pt-2">
                              <Button
                                size="sm"
                                onClick={() => handleAccept(application.id)}
                                disabled={updateApplication.isPending}
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowRejectModal(application.id)}
                                disabled={updateApplication.isPending}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Reject
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
              ))}
            </div>
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