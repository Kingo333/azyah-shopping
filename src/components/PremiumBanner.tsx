
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
    <GlassPanel className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-accent/10 to-accent-cartier/10" />
      <div className="relative flex flex-col sm:flex-row items-center justify-between gap-3 p-4 sm:p-6">
        <div className="text-center sm:text-left w-full sm:w-auto">
          <h3 className="text-base sm:text-lg font-semibold bg-gradient-to-r from-accent to-accent-cartier bg-clip-text text-transparent mb-1">
            Unlock Premium Access
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
            <span className="font-medium">30 AED/month</span>
            <span className="hidden sm:inline">•</span>
            <span className="leading-tight">More Daily Credits for Virtual Try-On and Beauty Guide • Unlimited replica • UGC collabs</span>
          </div>
        </div>
        
        <Button 
          onClick={handleUpgrade}
          disabled={loading}
          className="bg-gradient-to-r from-accent to-accent-cartier hover:from-accent/90 hover:to-accent-cartier/90 text-white shadow-lg hover:shadow-xl transition-all duration-200 group w-full sm:w-auto"
          size="sm"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
          ) : null}
          Upgrade Now
          <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
        </Button>
      </div>
    </GlassPanel>
  );
};

export default PremiumBanner;
