import React from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Crown, Sparkles, ArrowRight } from 'lucide-react';
import { GlassPanel } from '@/components/ui/glass-panel';

const PremiumBanner: React.FC = () => {
  const { isPremium, createPaymentIntent, loading } = useSubscription();

  // Don't show banner if user is already premium
  if (isPremium) {
    return null;
  }

  const handleUpgrade = async () => {
    await createPaymentIntent();
  };

  return (
    <div className="p-4 border border-border rounded-lg bg-card">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <h3 className="text-base font-medium text-foreground">
            Switch to Premium for full access
          </h3>
          <p className="text-sm text-muted-foreground">
            40 AED/month • Unlimited AI generations
          </p>
        </div>
        
        <Button 
          onClick={handleUpgrade}
          disabled={loading}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
          size="sm"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
          ) : null}
          Upgrade Now
        </Button>
      </div>
    </div>
  );
};

export default PremiumBanner;