import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useCollaborations, useUpdateCollaboration } from '@/hooks/useCollaborations';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CreateCollabWizard } from './CreateCollabWizard';
import { CollabApplicantsModal } from './CollabApplicantsModal';
import { Collaboration, CollabStatus } from '@/types/ugc';
import { MoreHorizontal, Plus, Users, Calendar, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface ManageCollaborationsTableProps {
  ownerOrgId: string;
  orgType: 'brand' | 'retailer';
}

export const ManageCollaborationsTable: React.FC<ManageCollaborationsTableProps> = ({
  ownerOrgId,
  orgType
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCollabId, setSelectedCollabId] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: collaborations, isLoading } = useCollaborations(user?.role, ownerOrgId);
  const updateCollaboration = useUpdateCollaboration();

  const handleStatusChange = async (collabId: string, newStatus: CollabStatus) => {
    try {
      await updateCollaboration.mutateAsync({
        id: collabId,
        updates: { status: newStatus }
      });
      toast({
        title: "Success",
        description: `Collaboration ${newStatus.toLowerCase()} successfully`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update collaboration status",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: CollabStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'default';
      case 'DRAFT':
        return 'secondary';
      case 'PAUSED':
        return 'outline';
      case 'CLOSED':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return 'No deadline';
    try {
      return format(new Date(deadline), 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const getPlatformIcons = (platforms: string[]) => {
    const iconMap: Record<string, string> = {
      facebook: '📘',
      instagram: '📷',
      snapchat: '👻',
      tiktok: '🎵'
    };
    
    return platforms.map(platform => iconMap[platform] || '📱').join(' ');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading collaborations...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Manage Collaborations</CardTitle>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Collaboration
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!collaborations || collaborations.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground mb-4">No collaborations yet</div>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Collaboration
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Platforms</TableHead>
                  <TableHead>Applications</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collaborations.map((collab) => (
                  <TableRow key={collab.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{collab.title}</div>
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {collab.brief}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(collab.status)}>
                        {collab.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span>{getPlatformIcons(collab.platforms)}</span>
                        <span className="text-sm text-muted-foreground">
                          ({collab.platforms.length})
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-1"
                        onClick={() => setSelectedCollabId(collab.id)}
                      >
                        <Users className="h-4 w-4" />
                        {collab.applications_count || 0}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {formatDeadline(collab.application_deadline)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(collab.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedCollabId(collab.id)}>
                            <Users className="h-4 w-4 mr-2" />
                            View Applications
                          </DropdownMenuItem>
                          {collab.status === 'DRAFT' && (
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(collab.id, 'ACTIVE')}
                            >
                              Publish
                            </DropdownMenuItem>
                          )}
                          {collab.status === 'ACTIVE' && (
                            <>
                              <DropdownMenuItem 
                                onClick={() => handleStatusChange(collab.id, 'PAUSED')}
                              >
                                Pause
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleStatusChange(collab.id, 'CLOSED')}
                              >
                                Close
                              </DropdownMenuItem>
                            </>
                          )}
                          {collab.status === 'PAUSED' && (
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(collab.id, 'ACTIVE')}
                            >
                              Resume
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateCollabWizard
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        ownerOrgId={ownerOrgId}
        orgType={orgType}
      />

      {selectedCollabId && (
        <CollabApplicantsModal
          open={!!selectedCollabId}
          onOpenChange={(open) => !open && setSelectedCollabId(null)}
          collabId={selectedCollabId}
        />
      )}
    </>
  );
};