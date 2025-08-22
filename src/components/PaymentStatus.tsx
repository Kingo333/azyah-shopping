
import React from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ZiinaPaymentButton } from '@/components/ZiinaPaymentButton';
import { Crown, CreditCard } from 'lucide-react';

export function PaymentStatus() {
  const { subscription, loading, isPremium } = useSubscription();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Subscription Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPremium ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-accent" />
              <Badge variant="default" className="bg-accent text-white">
                Premium Active
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Plan: {subscription?.plan}</p>
              <p>Status: {subscription?.status}</p>
              {subscription?.current_period_end && (
                <p>Next billing: {new Date(subscription.current_period_end).toLocaleDateString()}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Badge variant="outline">Free Plan</Badge>
            <p className="text-sm text-muted-foreground">
              You're currently on the free plan. Upgrade to Premium for unlimited access.
            </p>
            <ZiinaPaymentButton size="sm" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
