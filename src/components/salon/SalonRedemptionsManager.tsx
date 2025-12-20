import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TutorialTooltip } from '@/components/ui/tutorial-tooltip';
import { useSalonRedemptions, useRedemptionActions } from '@/hooks/useSalonOwner';
import { Check, X, Loader2, Clock, Gift, Ticket, Copy, CheckCircle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface SalonRedemptionsManagerProps {
  salonId: string;
}

export const SalonRedemptionsManager: React.FC<SalonRedemptionsManagerProps> = ({ salonId }) => {
  const { data: redemptions = [], isLoading } = useSalonRedemptions(salonId);
  const { approveRedemption, markRedeemed } = useRedemptionActions();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  const pendingRedemptions = redemptions.filter(r => r.status === 'pending');
  const approvedRedemptions = redemptions.filter(r => r.status === 'approved');
  const completedRedemptions = redemptions.filter(r => r.status === 'redeemed');
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Approved</Badge>;
      case 'redeemed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Redeemed</Badge>;
      case 'expired':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-600">Expired</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };
  
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };
  
  const handleApprove = async (redemptionId: string) => {
    await approveRedemption.mutateAsync(redemptionId);
  };
  
  const handleMarkRedeemed = async (redemptionId: string) => {
    await markRedeemed.mutateAsync(redemptionId);
  };
  
  const renderRedemptionCard = (redemption: any, showActions: 'approve' | 'mark' | 'none') => (
    <Card key={redemption.id} className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={redemption.users?.avatar_url} />
              <AvatarFallback>
                {redemption.users?.name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{redemption.users?.name || 'Unknown User'}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Gift className="h-3 w-3" />
                <span>{redemption.salon_reward_offers?.discount_percent}% off</span>
                <span>•</span>
                <span>{redemption.salon_reward_offers?.points_cost} pts</span>
              </div>
            </div>
          </div>
          
          {getStatusBadge(redemption.status)}
        </div>
        
        {redemption.redemption_code && (
          <div className="mt-3 p-2 bg-muted rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-muted-foreground" />
              <code className="font-mono text-sm font-bold">{redemption.redemption_code}</code>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyCode(redemption.redemption_code)}
            >
              {copiedCode === redemption.redemption_code ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
        
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(redemption.created_at), { addSuffix: true })}
          </div>
          
          {showActions === 'approve' && (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleApprove(redemption.id)}
                disabled={approveRedemption.isPending}
              >
                {approveRedemption.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Approve
                  </>
                )}
              </Button>
            </div>
          )}
          
          {showActions === 'mark' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleMarkRedeemed(redemption.id)}
              disabled={markRedeemed.isPending}
            >
              {markRedeemed.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Mark Used
                </>
              )}
            </Button>
          )}
        </div>
        
        {redemption.expires_at && redemption.status === 'approved' && (
          <p className="text-xs text-muted-foreground mt-2">
            Expires: {format(new Date(redemption.expires_at), 'MMM d, yyyy h:mm a')}
          </p>
        )}
      </CardContent>
    </Card>
  );
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Redemptions</CardTitle>
          <TutorialTooltip
            feature="salon-redemptions-tutorial"
            content={
              <div className="space-y-2">
                <p className="font-medium">Manage redemptions here</p>
                <p className="text-sm text-muted-foreground">
                  When customers request a discount, you'll see it here. Approve to generate a code, then mark as redeemed after they use it.
                </p>
              </div>
            }
          >
            <span className="text-muted-foreground cursor-help">ⓘ</span>
          </TutorialTooltip>
          
          {pendingRedemptions.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {pendingRedemptions.length} pending
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="pending">
          <TabsList className="mb-4">
            <TabsTrigger value="pending" className="relative">
              Pending
              {pendingRedemptions.length > 0 && (
                <span className="ml-1 text-xs bg-destructive text-destructive-foreground rounded-full px-1.5">
                  {pendingRedemptions.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved
              {approvedRedemptions.length > 0 && (
                <span className="ml-1 text-xs bg-blue-500 text-white rounded-full px-1.5">
                  {approvedRedemptions.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending">
            {pendingRedemptions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No pending redemptions</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {pendingRedemptions.map(r => renderRedemptionCard(r, 'approve'))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="approved">
            {approvedRedemptions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Ticket className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No approved redemptions waiting to be used</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {approvedRedemptions.map(r => renderRedemptionCard(r, 'mark'))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="completed">
            {completedRedemptions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No completed redemptions yet</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {completedRedemptions.map(r => renderRedemptionCard(r, 'none'))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
