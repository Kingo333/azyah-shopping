import React from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Gift } from 'lucide-react';
const PremiumBanner: React.FC = () => {
  const {
    isPremium,
    createPaymentIntent,
    loading
  } = useSubscription();

  // Don't show banner if user is already premium
  if (isPremium) {
    return null;
  }
  const handleUpgrade = async () => {
    await createPaymentIntent();
  };
  return (
    <section className="px-4">
      <div className="rounded-xl border bg-card shadow-sm p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4" />
          <span className="text-sm font-medium">Premium • 30 AED/month</span>
        </div>
        <Button 
          onClick={handleUpgrade}
          size="sm"
          disabled={loading}
        >
          {loading ? (
            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            'Upgrade'
          )}
        </Button>
      </div>
    </section>
  );
};
export default PremiumBanner;