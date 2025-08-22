
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import type { PaymentRecord, PaymentIntentStatus } from '@/types/ziina';

interface PaymentWithUser extends PaymentRecord {
  user_email?: string;
}

interface WebhookEvent {
  id: string;
  provider: string;
  event: string;
  pi_id: string;
  processed: boolean;
  created_at: string;
  ip?: string;
}

const PaymentAdminPanel: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<PaymentWithUser[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refundId, setRefundId] = useState('');
  const [refundStatus, setRefundStatus] = useState<any>(null);
  const [refundLoading, setRefundLoading] = useState(false);

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          users!inner(email)
        `)
        .eq('provider', 'ziina')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const paymentsWithEmail = data?.map(payment => ({
        ...payment,
        user_email: payment.users?.email
      })) || [];

      setPayments(paymentsWithEmail);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch payments",
        variant: "destructive"
      });
    }
  };

  const fetchWebhookEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('webhook_events')
        .select('*')
        .eq('provider', 'ziina')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setWebhookEvents(data || []);
    } catch (error) {
      console.error('Error fetching webhook events:', error);
      toast({
        title: "Error",
        description: "Failed to fetch webhook events",
        variant: "destructive"
      });
    }
  };

  const fetchRefundStatus = async () => {
    if (!refundId.trim()) return;
    
    setRefundLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-refund', {
        body: { refund_id: refundId },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) throw error;
      setRefundStatus(data);
      
      toast({
        title: "Success",
        description: "Refund status fetched successfully"
      });
    } catch (error: any) {
      console.error('Error fetching refund:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch refund status",
        variant: "destructive"
      });
    } finally {
      setRefundLoading(false);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    await Promise.all([fetchPayments(), fetchWebhookEvents()]);
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [user]);

  const getStatusBadgeVariant = (status: PaymentIntentStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'pending':
      case 'requires_user_action':
      case 'requires_payment_instrument':
        return 'secondary';
      case 'failed':
      case 'canceled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: PaymentIntentStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
      case 'canceled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payment Administration</h1>
        <Button onClick={refreshData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="payments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="refunds">Refunds</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {payments.map((payment) => (
                  <div key={payment.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(payment.status)}
                        <Badge variant={getStatusBadgeVariant(payment.status)}>
                          {payment.status}
                        </Badge>
                        <span className="text-sm font-medium">
                          {payment.payment_intent_id}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {(payment.amount_fils / 100).toFixed(2)} {payment.currency}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">User:</span> {payment.user_email}
                      </div>
                      <div>
                        <span className="font-medium">Product:</span> {payment.product}
                      </div>
                      {payment.fee_amount_fils && (
                        <div>
                          <span className="font-medium">Fee:</span> {(payment.fee_amount_fils / 100).toFixed(2)} {payment.currency}
                        </div>
                      )}
                      {payment.latest_error_message && (
                        <div className="col-span-2">
                          <span className="font-medium text-red-600">Error:</span> 
                          <span className="text-red-600"> {payment.latest_error_message}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {payments.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No payments found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Webhook Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {webhookEvents.map((event) => (
                  <div key={event.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant={event.processed ? "default" : "secondary"}>
                          {event.processed ? "Processed" : "Pending"}
                        </Badge>
                        <span className="font-medium">{event.event}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(event.created_at).toLocaleString()}
                      </div>
                    </div>
                    
                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Payment Intent:</span> {event.pi_id}
                      </div>
                      {event.ip && (
                        <div>
                          <span className="font-medium">IP:</span> {event.ip}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {webhookEvents.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No webhook events found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="refunds" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Refund Status Checker</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end space-x-2">
                <div className="flex-1">
                  <Label htmlFor="refundId">Refund ID</Label>
                  <Input
                    id="refundId"
                    value={refundId}
                    onChange={(e) => setRefundId(e.target.value)}
                    placeholder="Enter refund ID to check status"
                  />
                </div>
                <Button 
                  onClick={fetchRefundStatus} 
                  disabled={refundLoading || !refundId.trim()}
                >
                  {refundLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Check Status"
                  )}
                </Button>
              </div>

              {refundStatus && (
                <div className="border rounded-lg p-4 bg-muted">
                  <h4 className="font-medium mb-2">Refund Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">ID:</span> {refundStatus.id}
                    </div>
                    <div>
                      <span className="font-medium">Status:</span> 
                      <Badge className="ml-2" variant={refundStatus.status === 'completed' ? 'default' : 'secondary'}>
                        {refundStatus.status}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">Amount:</span> {(refundStatus.amount / 100).toFixed(2)} {refundStatus.currency_code}
                    </div>
                    <div>
                      <span className="font-medium">Created:</span> {new Date(refundStatus.created_at).toLocaleString()}
                    </div>
                    {refundStatus.error && (
                      <div className="col-span-2">
                        <span className="font-medium text-red-600">Error:</span>
                        <span className="text-red-600"> {refundStatus.error.message}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PaymentAdminPanel;
