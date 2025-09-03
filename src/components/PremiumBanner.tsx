import React, { useState } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Gift, ChevronDown, ChevronUp, Sparkles, Shield, Users } from 'lucide-react';
const PremiumBanner: React.FC = () => {
  const {
    isPremium,
    createPaymentIntent,
    loading
  } = useSubscription();
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't show banner if user is already premium
  if (isPremium) {
    return null;
  }

  const handleUpgrade = async () => {
    await createPaymentIntent();
  };

  const premiumBenefits = [
    { icon: Sparkles, text: "More daily credits for Virtual Try-On" },
    { icon: Shield, text: "More daily credits for the Beauty Guide" },
    { icon: Users, text: "UGC collabs, Priority Support" }
  ];

  return (
    <section className="px-4">
      <div className="rounded-xl border bg-card shadow-sm">
        <div 
          className="p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            <span className="text-sm font-medium">Premium • 30 AED/month</span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                handleUpgrade();
              }}
              size="sm"
              disabled={loading}
            >
              {loading ? (
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                'Upgrade'
              )}
            </Button>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
        
        {isExpanded && (
          <div className="px-3 pb-3 pt-0 space-y-3 border-t border-border/50">
            {premiumBenefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-3">
                <benefit.icon className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">{benefit.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
export default PremiumBanner;