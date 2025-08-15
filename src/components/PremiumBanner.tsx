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
    <GlassPanel className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white">
            <Crown className="h-6 w-6" />
          </div>
          <div className="text-center sm:text-left">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              Switch to Premium for full access
              <Sparkles className="h-4 w-4 text-purple-500" />
            </h3>
            <p className="text-sm text-muted-foreground">
              Only 40 AED / month • Unlimited AI generations • Priority support
            </p>
          </div>
        </div>
        
        <Button 
          onClick={handleUpgrade}
          disabled={loading}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          size="lg"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
          ) : (
            <Crown className="h-4 w-4 mr-2" />
          )}
          Upgrade Now
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </GlassPanel>
  );
};

export default PremiumBanner;