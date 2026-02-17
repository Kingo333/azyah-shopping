import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Check, Crown, Sparkles, Users, Gift, TrendingUp, Loader2, RotateCcw, Ruler, Heart, DollarSign, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';
import { usePremium, updatePremiumStatus, syncSubscriptionRecord } from '@/hooks/usePremium';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  isNativeIOS, 
  initIap, 
  getProducts, 
  purchaseProduct, 
  restorePurchases,
  PRODUCT_IDS,
  type IAPProduct 
} from '@/lib/iap';

const features = [
  { icon: <Sparkles className="h-3.5 w-3.5" />, name: 'AI Try-On' },
  { icon: <Users className="h-3.5 w-3.5" />, name: 'UGC Collabs' },
  { icon: <Gift className="h-3.5 w-3.5" />, name: 'Redeem Points' },
  { icon: <Ruler className="h-3.5 w-3.5" />, name: 'Height/Fit Check' },
  { icon: <Heart className="h-3.5 w-3.5" />, name: 'Taste Learning' },
  { icon: <DollarSign className="h-3.5 w-3.5" />, name: 'Find Deals' },
];

const comparisonFeatures = [
  { name: 'Create outfits', free: '5 total', premium: 'Unlimited' },
  { name: 'Connect with community', free: true, premium: true },
  { name: 'Wardrobe items', free: '10 items', premium: 'Unlimited' },
  { name: 'AI Try-on', free: '5 total', premium: '10/day' },
  { name: 'UGC collaboration', free: '5 listings', premium: 'Full access' },
  { name: 'Points → Credits', free: false, premium: true },
  { name: 'Priority support', free: false, premium: true },
];

// Default prices (shown on web or if StoreKit fails)
const DEFAULT_PRICES = {
  monthly: { price: 30, priceString: 'AED 30', currency: 'AED' },
  yearly: { price: 200, priceString: 'AED 200', currency: 'AED', monthlyEquivalent: 'AED 17' }
};

export default function Upgrade() {
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'monthly' | 'yearly'>('yearly');
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [iapInitialized, setIapInitialized] = useState(false);
  const [products, setProducts] = useState<IAPProduct[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const navigate = useNavigate();
  const { isPremium: isSubPremium, subscription } = useSubscription();
  const { isPremium, refetch: refetchPremium } = usePremium();

  // Initialize IAP on native iOS
  useEffect(() => {
    const initializeIAP = async () => {
      if (isNativeIOS()) {
        const initialized = await initIap();
        setIapInitialized(initialized);

        if (initialized) {
          try {
            const fetchedProducts = await getProducts([
              PRODUCT_IDS.MONTHLY,
              PRODUCT_IDS.YEARLY
            ]);
            setProducts(fetchedProducts);
            console.log('[Upgrade] Products loaded:', fetchedProducts);
          } catch (error) {
            console.error('[Upgrade] Failed to fetch products:', error);
          }
        }
      }
    };

    initializeIAP();
  }, []);

  // Get localized price for a product
  const getProductPrice = (productId: string) => {
    const product = products.find(p => p.identifier === productId);
    if (product) {
      return {
        price: product.price,
        priceString: product.priceString,
        currency: product.currencyCode
      };
    }
    // Fallback to defaults
    return productId === PRODUCT_IDS.YEARLY 
      ? DEFAULT_PRICES.yearly 
      : DEFAULT_PRICES.monthly;
  };

  const yearlyPrice = getProductPrice(PRODUCT_IDS.YEARLY);
  const monthlyPrice = getProductPrice(PRODUCT_IDS.MONTHLY);

  // Calculate monthly equivalent for yearly plan
  const yearlyMonthlyEquivalent = products.find(p => p.identifier === PRODUCT_IDS.YEARLY)
    ? `${yearlyPrice.currency} ${Math.round(yearlyPrice.price / 12)}`
    : DEFAULT_PRICES.yearly.monthlyEquivalent;

  const handleContinue = async () => {
    if (selectedPlan === 'free') {
      await handleFreePlan();
      return;
    }

    // On web, show toast that subscriptions are iOS-only
    if (!isNativeIOS()) {
      toast.info('Subscriptions are available on iOS. Download the app to subscribe!');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in first');
        navigate('/onboarding/signup');
        return;
      }

      // On native iOS, use StoreKit purchase
      if (iapInitialized) {
        const productId = selectedPlan === 'yearly' 
          ? PRODUCT_IDS.YEARLY 
          : PRODUCT_IDS.MONTHLY;

        const result = await purchaseProduct(productId);

        if (result.cancelled) {
          setLoading(false);
          return;
        }

        if (!result.success) {
          toast.error(result.error || 'Purchase failed. Please try again.');
          setLoading(false);
          return;
        }

        const planType = selectedPlan as 'monthly' | 'yearly';
        const expiresAt = result.expiresAt || 
          new Date(Date.now() + (selectedPlan === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000);

        const updateResult = await updatePremiumStatus(user.id, true, planType, expiresAt);
        if (!updateResult.success) {
          console.error('Failed to update premium status:', updateResult.error);
        }

        await syncSubscriptionRecord(user.id, planType, expiresAt);
        await refetchPremium();

        toast.success('Azyah Premium activated – enjoy unlimited outfits and salon rewards ✨');
        navigate('/dashboard');
        return;
      } else {
        toast.error('In-app purchases not available. Please restart the app.');
      }
    } catch (error) {
      console.error('Error upgrading:', error);
      toast.error('Failed to upgrade. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFreePlan = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Not authenticated');
        navigate('/onboarding/signup');
        return;
      }

      const { error } = await supabase
        .from('users')
        .update({ 
          onboarding_completed: true,
          preferences_completed: true 
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('You can upgrade to Premium anytime!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error continuing with free plan:', error);
      toast.error('Failed to continue');
    } finally {
      setLoading(false);
    }
  };

  const handleRestorePurchases = async () => {
    if (!isNativeIOS()) {
      toast.info('Restore purchases is only available on iOS devices');
      return;
    }

    setRestoring(true);
    try {
      const result = await restorePurchases();

      if (!result.success) {
        toast.error(result.error || 'Failed to restore purchases');
        return;
      }

      if (!result.hasActiveSubscription) {
        toast.info('No active subscription found');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in first');
        return;
      }

      const planType: 'monthly' | 'yearly' = 
        result.activeProductId === PRODUCT_IDS.YEARLY ? 'yearly' : 'monthly';

      await updatePremiumStatus(user.id, true, planType, result.expiresAt || null);
      await syncSubscriptionRecord(user.id, planType, result.expiresAt || null);
      await refetchPremium();

      toast.success('Premium restored on this device ✅');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error restoring purchases:', error);
      toast.error('Failed to restore purchases');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[hsl(var(--azyah-maroon))]/12 via-background to-primary/8">
      {/* Decorative radial gradient */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 30% 20%, hsl(var(--azyah-maroon) / 0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, hsl(var(--primary) / 0.06) 0%, transparent 50%)'
      }} />
      {/* Subtle dot pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
        backgroundImage: 'radial-gradient(circle, hsl(var(--azyah-maroon)) 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }} />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/70 backdrop-blur-xl border-b border-white/20 px-4 py-2 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">Choose Your Plan</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4 relative z-[1]">
        {/* Hero */}
        <div className="relative text-center flex flex-col items-center gap-1.5 bg-white/50 backdrop-blur-xl rounded-2xl border border-white/20 p-3 overflow-hidden">
          {/* Shimmer overlay */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 3s ease-in-out infinite',
          }} />
          <div className="relative z-[1] flex flex-col items-center gap-1">
            <div className="rounded-full p-2 bg-[hsl(var(--azyah-maroon))]/10 shadow-[0_0_20px_hsl(var(--azyah-maroon)/0.15)]">
              <Sparkles className="h-7 w-7 text-[hsl(var(--azyah-maroon))]" />
            </div>
            <h2 className="text-lg font-bold">Unlock Azyah Premium</h2>
            <p className="text-xs text-muted-foreground">Get the most out of your fashion journey</p>
          </div>
        </div>

        {/* Feature Pills - glass */}
        <div className="grid grid-cols-3 gap-2">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center justify-center gap-1 bg-white/40 backdrop-blur-md border border-white/20 text-foreground px-2 py-1.5 rounded-full text-[10px] sm:text-xs font-medium">
              <span className="text-[hsl(var(--azyah-maroon))]">{feature.icon}</span>
              <span className="truncate">{feature.name}</span>
            </div>
          ))}
        </div>

        {/* Plan Selection */}
        <div className="space-y-2">
          {/* Yearly */}
          <div
            onClick={() => setSelectedPlan('yearly')}
            className={cn(
              "cursor-pointer transition-all active:scale-[0.98] relative rounded-xl border p-0 overflow-hidden",
              selectedPlan === 'yearly' 
                ? "bg-white/80 backdrop-blur-lg border-[hsl(var(--azyah-maroon))]/40 ring-2 ring-[hsl(var(--azyah-maroon))] shadow-[inset_0_0_16px_hsl(var(--azyah-maroon)/0.06)]" 
                : "bg-white/60 backdrop-blur-lg border-white/30"
            )}
          >
            <div className="absolute top-0 left-4 -translate-y-1/2 flex items-center gap-1 bg-foreground text-background px-2.5 py-0.5 rounded-full text-[10px] font-bold">
              BEST VALUE
            </div>
            <div className="p-4 pt-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold">Yearly</h3>
                <p className="text-xs text-muted-foreground">
                  {yearlyPrice.priceString}/year • Save 44%
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">
                  {yearlyMonthlyEquivalent}
                  <span className="text-xs text-muted-foreground">/mo</span>
                </span>
                {selectedPlan === 'yearly' && <Check className="h-5 w-5 text-[hsl(var(--azyah-maroon))]" />}
              </div>
            </div>
          </div>

          {/* Monthly */}
          <div
            onClick={() => setSelectedPlan('monthly')}
            className={cn(
              "cursor-pointer transition-all active:scale-[0.98] rounded-xl border p-0 overflow-hidden",
              selectedPlan === 'monthly' 
                ? "bg-white/80 backdrop-blur-lg border-[hsl(var(--azyah-maroon))]/40 ring-2 ring-[hsl(var(--azyah-maroon))] shadow-[inset_0_0_16px_hsl(var(--azyah-maroon)/0.06)]" 
                : "bg-white/60 backdrop-blur-lg border-white/30"
            )}
          >
            <div className="p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold">Monthly</h3>
                <p className="text-xs text-muted-foreground">Billed monthly</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">
                  {monthlyPrice.priceString}
                  <span className="text-xs text-muted-foreground">/mo</span>
                </span>
                {selectedPlan === 'monthly' && <Check className="h-5 w-5 text-[hsl(var(--azyah-maroon))]" />}
              </div>
            </div>
          </div>

          {/* Free */}
          <button
            onClick={() => setSelectedPlan('free')}
            className={cn(
              "w-full text-center text-sm py-1.5 rounded-lg transition-colors",
              selectedPlan === 'free' ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Continue with Free
          </button>
        </div>

        {/* CTA */}
        <div className="space-y-2">
          <Button
            onClick={handleContinue}
            disabled={loading || restoring}
            className="w-full h-12 font-semibold text-base bg-gradient-to-r from-[hsl(var(--azyah-maroon))] to-primary text-white shadow-[0_4px_20px_hsl(var(--azyah-maroon)/0.3)] hover:shadow-[0_6px_28px_hsl(var(--azyah-maroon)/0.4)] transition-shadow border-0"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {selectedPlan === 'free' ? 'Continue Free' : `Upgrade to ${selectedPlan === 'yearly' ? 'Yearly' : 'Monthly'}`}
          </Button>
          
          {selectedPlan !== 'free' && (
            <p className="text-center text-xs text-muted-foreground">Cancel anytime from Settings</p>
          )}

          {/* Restore Purchases - only show on iOS */}
          {isNativeIOS() && (
            <button
              onClick={handleRestorePurchases}
              disabled={restoring || loading}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-2 flex items-center justify-center gap-1"
            >
              {restoring ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RotateCcw className="h-3 w-3" />
              )}
              Restore purchases
            </button>
          )}
        </div>

        {/* Comparison Table - Collapsible */}
        <Collapsible open={comparisonOpen} onOpenChange={setComparisonOpen}>
          <div className="bg-white/50 backdrop-blur-xl rounded-xl border border-white/20 overflow-hidden">
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-white/20 transition-colors">
                <span>Free vs Premium</span>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", comparisonOpen && "rotate-180")} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-t border-b border-white/20">
                    <th className="text-left p-2.5 font-medium">Feature</th>
                    <th className="text-center p-2.5 font-medium w-20">Free</th>
                    <th className="text-center p-2.5 font-medium w-20">Premium</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((feature, index) => (
                    <tr key={index} className={cn("border-b border-white/10 last:border-0", index % 2 === 0 && "bg-white/20")}>
                      <td className="p-2.5">{feature.name}</td>
                      <td className="p-2.5 text-center">
                        {typeof feature.free === 'string' ? (
                          <span className="text-muted-foreground">{feature.free}</span>
                        ) : feature.free ? (
                          <Check className="h-3.5 w-3.5 text-green-600 mx-auto" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center">
                        {typeof feature.premium === 'string' ? (
                          <span className="text-[hsl(var(--azyah-maroon))] font-medium">{feature.premium}</span>
                        ) : feature.premium ? (
                          <Check className="h-3.5 w-3.5 text-[hsl(var(--azyah-maroon))] mx-auto" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Footer */}
        <div className="flex justify-center gap-4 text-xs text-muted-foreground pb-4">
          <button className="hover:underline" onClick={() => navigate('/terms')}>Terms</button>
          <button className="hover:underline" onClick={() => navigate('/privacy')}>Privacy</button>
          <button className="hover:underline" onClick={() => navigate('/cookies')}>Cookies</button>
        </div>
      </div>

      {/* Shimmer keyframes */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}
