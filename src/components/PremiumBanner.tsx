import React, { useState } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Gift, ChevronDown, ChevronUp, Sparkles, Zap, Star, Crown } from 'lucide-react';

const PremiumBanner: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
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
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <div className="rounded-xl border bg-gradient-to-r from-primary/10 to-accent/10 shadow-sm p-3 flex items-center justify-between cursor-pointer hover:from-primary/15 hover:to-accent/15 transition-all">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" />
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
                className="shadow-sm"
              >
                {loading ? (
                  <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Upgrade'
                )}
              </Button>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="mt-3 rounded-xl border bg-card/50 backdrop-blur-sm p-4 space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" />
              Premium Features
            </h3>
            
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex items-center gap-3">
                <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                <span>Unlimited AI Try-On & Style Generation</span>
              </div>
              <div className="flex items-center gap-3">
                <Zap className="h-4 w-4 text-primary flex-shrink-0" />
                <span>Priority Processing & Faster Results</span>
              </div>
              <div className="flex items-center gap-3">
                <Star className="h-4 w-4 text-primary flex-shrink-0" />
                <span>Exclusive Premium Brands & Collections</span>
              </div>
              <div className="flex items-center gap-3">
                <Crown className="h-4 w-4 text-primary flex-shrink-0" />
                <span>Advanced Personalization & Recommendations</span>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
};

export default PremiumBanner;