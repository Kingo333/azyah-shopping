import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Check, Crown, Sparkles, Users, Gift, TrendingUp, Loader2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';
import { usePremium, updatePremiumStatus, syncSubscriptionRecord } from '@/hooks/usePremium';
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
  { 
    icon: <Users className="h-5 w-5" />,
    name: 'UGC Collaboration',
    description: 'Access all brand partnerships'
  },
  { 
    icon: <Sparkles className="h-5 w-5" />,
    name: '10 AI Try-Ons Daily',
    description: '10 virtual try-ons per day'
  },
  { 
    icon: <TrendingUp className="h-5 w-5" />,
    name: 'AI Beauty Consultant',
    description: 'Unlimited beauty analysis'
  },
  { 
    icon: <Gift className="h-5 w-5" />,
    name: 'Nail & Salon Rewards',
    description: 'Exclusive rewards and benefits'
  },
];

const comparisonFeatures = [
  { name: 'Create outfits', free: '5 total', premium: 'Unlimited' },
  { name: 'Connect with community', free: true, premium: true },
  { name: 'Wardrobe items', free: '10 items', premium: 'Unlimited' },
  { name: 'AI Try-on', free: '4 total', premium: '10/day' },
  { name: 'AI Beauty Consultant', free: '4 credits', premium: 'Unlimited' },
  { name: 'UGC collaboration', free: '5 listings', premium: 'Full access' },
  { name: 'Nail / Salon rewards', free: false, premium: true },
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
          // User cancelled - just return silently
          setLoading(false);
          return;
        }

        if (!result.success) {
          toast.error(result.error || 'Purchase failed. Please try again.');
          setLoading(false);
          return;
        }

        // Purchase successful - update Supabase profiles table
        const planType = selectedPlan as 'monthly' | 'yearly';
        const expiresAt = result.expiresAt || 
          new Date(Date.now() + (selectedPlan === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000);

        // Update profiles table
        const updateResult = await updatePremiumStatus(user.id, true, planType, expiresAt);
        if (!updateResult.success) {
          console.error('Failed to update premium status:', updateResult.error);
        }

        // Sync subscription record for consistency (sensitive IDs handled by webhook)
        await syncSubscriptionRecord(
          user.id,
          planType,
          expiresAt
        );

        // Refetch premium status
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

      // Update users table for onboarding flags only
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

      // Active subscription found - update Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in first');
        return;
      }

      // Determine plan type from product ID
      const planType: 'monthly' | 'yearly' = 
        result.activeProductId === PRODUCT_IDS.YEARLY ? 'yearly' : 'monthly';

      // Update premium status in profiles table
      await updatePremiumStatus(user.id, true, planType, result.expiresAt || null);
      
      // Sync subscription record (sensitive IDs handled by webhook)
      await syncSubscriptionRecord(
        user.id,
        planType,
        result.expiresAt || null
      );

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-2 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">Choose Your Plan</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Hero - Compact */}
        <div className="text-center flex flex-col items-center gap-1">
          <Crown className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold">Unlock Azyah Premium</h2>
          <p className="text-sm text-muted-foreground">Get the most out of your fashion journey</p>
        </div>

        {/* Feature Highlights - 2 column grid on mobile */}
        <div className="grid grid-cols-2 gap-2">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center justify-center gap-1 bg-primary/10 text-primary px-2 py-1.5 rounded-full text-[10px] sm:text-xs font-medium">
              <span className="[&>svg]:h-3.5 [&>svg]:w-3.5 sm:[&>svg]:h-4 sm:[&>svg]:w-4">{feature.icon}</span>
              <span className="truncate">{feature.name}</span>
            </div>
          ))}
        </div>

        {/* Plan Selection - Compact cards */}
        <div className="space-y-2">
          {/* Yearly */}
          <Card
            onClick={() => setSelectedPlan('yearly')}
            className={cn(
              "cursor-pointer transition-all relative",
              selectedPlan === 'yearly' && "border-primary ring-2 ring-primary"
            )}
          >
            <div className="absolute -top-2 left-4 bg-foreground text-background px-2 py-0.5 rounded-full text-[10px] font-bold">
              BEST VALUE
            </div>
            <CardContent className="p-3 flex items-center justify-between">
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
                {selectedPlan === 'yearly' && <Check className="h-5 w-5 text-primary" />}
              </div>
            </CardContent>
          </Card>

          {/* Monthly */}
          <Card
            onClick={() => setSelectedPlan('monthly')}
            className={cn(
              "cursor-pointer transition-all",
              selectedPlan === 'monthly' && "border-primary ring-2 ring-primary"
            )}
          >
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <h3 className="font-bold">Monthly</h3>
                <p className="text-xs text-muted-foreground">Billed monthly</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">
                  {monthlyPrice.priceString}
                  <span className="text-xs text-muted-foreground">/mo</span>
                </span>
                {selectedPlan === 'monthly' && <Check className="h-5 w-5 text-primary" />}
              </div>
            </CardContent>
          </Card>

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

        {/* Comparison Table - Compact */}
        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-sm">Free vs Premium</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Feature</th>
                  <th className="text-center p-2 font-medium w-20">Free</th>
                  <th className="text-center p-2 font-medium w-20">Premium</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((feature, index) => (
                  <tr key={index} className="border-b last:border-0">
                    <td className="p-2">{feature.name}</td>
                    <td className="p-2 text-center">
                      {typeof feature.free === 'string' ? (
                        <span className="text-muted-foreground">{feature.free}</span>
                      ) : feature.free ? (
                        <Check className="h-3.5 w-3.5 text-green-600 mx-auto" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-2 text-center">
                      {typeof feature.premium === 'string' ? (
                        <span className="text-primary font-medium">{feature.premium}</span>
                      ) : feature.premium ? (
                        <Check className="h-3.5 w-3.5 text-primary mx-auto" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="space-y-2">
          <Button
            onClick={handleContinue}
            disabled={loading || restoring}
            className="w-full h-11 font-semibold"
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

        {/* Footer */}
        <div className="flex justify-center gap-4 text-xs text-muted-foreground pb-4">
          <button className="hover:underline" onClick={() => navigate('/terms')}>Terms</button>
          <button className="hover:underline" onClick={() => navigate('/privacy')}>Privacy</button>
        </div>
      </div>
    </div>
  );
}
