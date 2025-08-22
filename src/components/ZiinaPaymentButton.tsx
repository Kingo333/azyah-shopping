
import React from 'react';
import { Button } from '@/components/ui/button';
import { Crown, Loader2 } from 'lucide-react';
import { useZiinaPayments } from '@/hooks/useZiinaPayments';
import { FEATURES } from '@/config/features';
import { MaintenancePaymentButton } from '@/components/MaintenancePaymentButton';

interface ZiinaPaymentButtonProps {
  test?: boolean;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children?: React.ReactNode;
  message?: string;
}

export function ZiinaPaymentButton({ 
  test = false, 
  variant = 'default',
  size = 'default',
  className,
  children,
  message = 'Azyah Premium Subscription'
}: ZiinaPaymentButtonProps) {
  const { createPaymentIntent, loading } = useZiinaPayments();

  if (FEATURES.PAYMENTS_MAINTENANCE) {
    return <MaintenancePaymentButton variant={variant} size={size} className={className} />;
  }

  const handlePayment = async () => {
    const result = await createPaymentIntent({
      amountAed: 40,
      test,
      message
    });

    if (result?.redirectUrl) {
      window.location.href = result.redirectUrl;
    }
  };

  return (
    <Button 
      onClick={handlePayment}
      disabled={loading}
      variant={variant}
      size={size}
      className={className}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Crown className="w-4 h-4 mr-2" />
      )}
      {children || (test ? 'Test Payment (Free)' : 'Upgrade to Premium - 40 AED')}
    </Button>
  );
}
