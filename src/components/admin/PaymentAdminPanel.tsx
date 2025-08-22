
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, RefreshCw, Eye, EyeOff } from 'lucide-react';
import type { PaymentRecord, PaymentIntentStatus } from '@/types/ziina';

interface PaymentWithUser extends PaymentRecord {
  user_email?: string;
  user_name?: string;
}

interface RefundData {
  id: string;
  payment_intent_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  error_message?: string;
  error_code?: string;
}

export function PaymentAdminPanel() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentWithUser[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithUser | null>(null);
  const [refundData, setRefundData] = useState<RefundData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showErrorDetails, setShowErrorDetails] = useState<string | null>(null);

  // Check if user is admin
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      fetchPayments();
    }
  }, [isAdmin]);

  const checkAdminStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!error && data?.role === 'admin') {
        setIsAdmin(true);
      }
    } catch (err) {
      console.error('Error checking admin status:', err);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError(null);

      // First fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (paymentsError) throw paymentsError;

      // Then fetch user data for each payment
      const paymentsWithUserData: PaymentWithUser[] = [];
      
      for (const payment of paymentsData || []) {
        let userData = null;
        
        if (payment.user_id) {
          const { data: user } = await supabase
            .from('users')
            .select('email, name')
            .eq('id', payment.user_id)
            .single();
          
          userData = user;
        }

        paymentsWithUserData.push({
          ...payment,
          status: payment.status as PaymentIntentStatus,
          user_email: userData?.email || 'Unknown',
          user_name: userData?.name || 'Unknown User'
        });
      }

      setPayments(paymentsWithUserData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchRefundDetails = async (paymentIntentId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('get-refund', {
        body: { payment_intent_id: paymentIntentId },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) {
        console.error('Refund fetch error:', error);
        return;
      }

      setRefundData(data);
    } catch (err) {
      console.error('Failed to fetch refund details:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'canceled': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const formatAmount = (amountFils: number) => {
    return `${(amountFils / 100).toFixed(2)} AED`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (!isAdmin) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Admin access required to view payment administration panel.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            Loading payment data...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Payment Administration</CardTitle>
          <Button onClick={fetchPayments} size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {payments.map((payment) => (
              <Card key={payment.id} className="border-l-4 border-l-blue-500">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium">Payment Details</p>
                      <p className="text-xs text-muted-foreground">ID: {payment.payment_intent_id}</p>
                      <p className="text-xs text-muted-foreground">Operation: {payment.operation_id}</p>
                      <p className="text-sm mt-1">{formatAmount(payment.amount_fils)}</p>
                      <Badge className={getStatusColor(payment.status)}>
                        {payment.status}
                      </Badge>
                    </div>

                    <div>
                      <p className="text-sm font-medium">User Information</p>
                      <p className="text-sm">{payment.user_name || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">{payment.user_email}</p>
                      <p className="text-xs text-muted-foreground">{payment.product}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium">Timestamps</p>
                      <p className="text-xs">Created: {formatDate(payment.created_at || '')}</p>
                      <p className="text-xs">Updated: {formatDate(payment.updated_at || '')}</p>
                      
                      {payment.fee_amount_fils && (
                        <p className="text-xs mt-1">
                          Fee: {formatAmount(payment.fee_amount_fils)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Admin Error Details */}
                  {(payment.latest_error_message || payment.latest_error_code) && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-red-600">Error Details (Admin Only)</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowErrorDetails(
                            showErrorDetails === payment.id ? null : payment.id
                          )}
                        >
                          {showErrorDetails === payment.id ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      
                      {showErrorDetails === payment.id && (
                        <div className="mt-2 p-3 bg-red-50 rounded-md">
                          {payment.latest_error_code && (
                            <p className="text-xs">
                              <span className="font-medium">Code:</span> {payment.latest_error_code}
                            </p>
                          )}
                          {payment.latest_error_message && (
                            <p className="text-xs mt-1">
                              <span className="font-medium">Message:</span> {payment.latest_error_message}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedPayment(payment);
                        fetchRefundDetails(payment.payment_intent_id);
                      }}
                    >
                      View Refund Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {payments.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No payments found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Refund Details Modal/Panel */}
      {selectedPayment && (
        <Card>
          <CardHeader>
            <CardTitle>Refund Details - {selectedPayment.payment_intent_id}</CardTitle>
          </CardHeader>
          <CardContent>
            {refundData ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Refund ID</p>
                    <p className="text-sm text-muted-foreground">{refundData.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <Badge className={getStatusColor(refundData.status)}>
                      {refundData.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Amount</p>
                    <p className="text-sm">{formatAmount(refundData.amount)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Created</p>
                    <p className="text-sm">{formatDate(refundData.created_at)}</p>
                  </div>
                </div>
                
                {(refundData.error_message || refundData.error_code) && (
                  <div className="mt-4 p-3 bg-red-50 rounded-md">
                    <p className="text-sm font-medium text-red-600">Refund Error</p>
                    {refundData.error_code && (
                      <p className="text-xs">Code: {refundData.error_code}</p>
                    )}
                    {refundData.error_message && (
                      <p className="text-xs">Message: {refundData.error_message}</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">No refund data available for this payment</p>
            )}
            
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedPayment(null);
                  setRefundData(null);
                }}
              >
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
