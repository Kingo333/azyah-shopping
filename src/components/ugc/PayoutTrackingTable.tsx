import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePayouts, useUpdatePayoutStatus } from '@/hooks/usePayouts';
import { DollarSign, Check, Clock, AlertTriangle, Ban } from 'lucide-react';
import { format } from 'date-fns';
import { PayoutStatus } from '@/types/ugc';

interface PayoutTrackingTableProps {
  ownerOrgId: string;
  collabFilter?: string;
}

export const PayoutTrackingTable: React.FC<PayoutTrackingTableProps> = ({
  ownerOrgId,
  collabFilter
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [markPaidModalOpen, setMarkPaidModalOpen] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<any>(null);

  const { data: payouts, isLoading } = usePayouts(undefined, collabFilter);
  const updatePayoutStatus = useUpdatePayoutStatus();

  // Filter payouts
  const filteredPayouts = payouts?.filter(p => {
    if (statusFilter === 'all') return true;
    return p.status === statusFilter;
  }) || [];

  // Calculate totals
  const totals = {
    owed: payouts?.filter(p => p.status === 'owed').reduce((sum, p) => sum + p.amount, 0) || 0,
    paid: payouts?.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0) || 0,
    hold: payouts?.filter(p => p.status === 'hold').reduce((sum, p) => sum + p.amount, 0) || 0,
    issues: payouts?.filter(p => p.status === 'unpaid_issue').length || 0
  };

  const getStatusBadge = (status: PayoutStatus) => {
    switch (status) {
      case 'pending_approval':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pending Approval</Badge>;
      case 'owed':
        return <Badge variant="outline"><DollarSign className="h-3 w-3 mr-1" /> Owed</Badge>;
      case 'hold':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> On Hold</Badge>;
      case 'confirmed':
        return <Badge variant="outline"><Check className="h-3 w-3 mr-1" /> Confirmed</Badge>;
      case 'paid':
        return <Badge variant="default"><Check className="h-3 w-3 mr-1" /> Paid</Badge>;
      case 'unpaid_issue':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" /> Issue</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleMarkPaid = async () => {
    if (!selectedPayout) return;

    try {
      await updatePayoutStatus.mutateAsync({
        payoutId: selectedPayout.id,
        status: 'paid'
      });
      setMarkPaidModalOpen(false);
      setSelectedPayout(null);
    } catch (error) {
      // Error handled by hook
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading payouts...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Owed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent-foreground">${totals.owed.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">On Hold</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totals.hold.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">${totals.paid.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{totals.issues}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payouts</SelectItem>
            <SelectItem value="owed">Owed</SelectItem>
            <SelectItem value="hold">On Hold</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="unpaid_issue">Issues</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {filteredPayouts.length} payout(s)
        </span>
      </div>

      {/* Payouts Table */}
      {filteredPayouts.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No payouts found
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Creator</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell className="font-medium">
                      {payout.creator_id?.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      {payout.currency} {payout.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{payout.payout_type}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(payout.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(payout.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      {(payout.status === 'owed' || payout.status === 'confirmed') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPayout(payout);
                            setMarkPaidModalOpen(true);
                          }}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Mark Paid
                        </Button>
                      )}
                      {payout.status === 'unpaid_issue' && payout.marked_unpaid_reason && (
                        <span className="text-xs text-destructive">
                          {payout.marked_unpaid_reason}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Mark Paid Modal */}
      <Dialog open={markPaidModalOpen} onOpenChange={setMarkPaidModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
          </DialogHeader>

          {selectedPayout && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Confirm that you have paid this creator outside the app.
              </p>
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">
                  {selectedPayout.currency} {selectedPayout.amount.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Creator: {selectedPayout.creator_id?.slice(0, 8)}...
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setMarkPaidModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleMarkPaid}
                  disabled={updatePayoutStatus.isPending}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Confirm Paid
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
