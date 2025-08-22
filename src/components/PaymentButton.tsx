
import React from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Crown, Loader2 } from 'lucide-react';

interface PaymentButtonProps {
  test?: boolean;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children?: React.ReactNode;
}

export function PaymentButton({ 
  test = false, 
  variant = 'default',
  size = 'default',
  className,
  children 
}: PaymentButtonProps) {
  const { createPaymentIntent, loading, isPremium } = useSubscription();

  const handlePayment = async () => {
    await createPaymentIntent(test);
  };

  if (isPremium) {
    return (
      <Button variant="outline" disabled className={className} size={size}>
        <Crown className="w-4 h-4 mr-2" />
        Premium Active
      </Button>
    );
  }

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
      {children || (test ? 'Test Payment (Free)' : 'Upgrade to Premium')}
    </Button>
  );
}
