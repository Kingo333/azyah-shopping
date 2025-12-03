import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Check, Crown, Sparkles, Users, Gift, TrendingUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';

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

export default function Upgrade() {
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'monthly' | 'yearly'>('yearly');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isPremium, subscription } = useSubscription();

  const handleContinue = async () => {
    if (selectedPlan === 'free') {
      await handleFreePlan();
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in first');
        navigate('/onboarding/signup');
        return;
      }

      // For now, since we're removing Ziina, just mark as premium directly
      // TODO: Integrate with actual payment provider when ready
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update subscription in database
      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          plan: selectedPlan,
          status: 'active',
          plan_tier: selectedPlan,
          currency: 'AED',
          price_cents: selectedPlan === 'yearly' ? 30000 : 4000, // AED 300 or AED 40
          features_granted: {
            ugc_collaboration: true,
            ai_tryon_limit: 10,
            early_access: true,
            premium_support: true
          },
          current_period_end: new Date(Date.now() + (selectedPlan === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (subError) throw subError;

      toast.success('🎉 You\'re now Premium! Enjoy all features.');
      navigate('/dashboard');
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

      // Mark user as having completed onboarding
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">Choose Your Plan</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Crown className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">Unlock Azyah Premium</h2>
          <p className="text-muted-foreground">
            Get the most out of your fashion journey
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-2 gap-4">
          {features.map((feature, index) => (
            <Card key={index} className="border-primary/20">
              <CardContent className="p-4 space-y-2">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-sm">{feature.name}</h3>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Feature Comparison Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">What you get</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-semibold text-sm">Feature</th>
                    <th className="text-center p-4 font-semibold text-sm">Free</th>
                    <th className="text-center p-4 font-semibold text-sm">Premium</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((feature, index) => (
                    <tr key={index} className="border-b last:border-0">
                      <td className="p-4 text-sm">{feature.name}</td>
                      <td className="p-4 text-center">
                        {typeof feature.free === 'string' ? (
                          <span className="text-xs text-muted-foreground">{feature.free}</span>
                        ) : feature.free ? (
                          <Check className="h-4 w-4 text-green-600 mx-auto" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {typeof feature.premium === 'string' ? (
                          <span className="text-xs text-primary font-medium">{feature.premium}</span>
                        ) : feature.premium ? (
                          <Check className="h-4 w-4 text-primary mx-auto" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Plan Selection */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Select your plan</h3>
          
          {/* Yearly Plan */}
          <Card
            onClick={() => setSelectedPlan('yearly')}
            className={cn(
              "cursor-pointer transition-all relative",
              selectedPlan === 'yearly' && "border-primary ring-2 ring-primary"
            )}
          >
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-foreground text-background px-3 py-1 rounded-full text-xs font-bold">
              MOST POPULAR
            </div>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Yearly Plan</h3>
                <p className="text-sm text-muted-foreground">12 months • AED 300</p>
                <p className="text-xs text-primary font-medium mt-1">Save 37%</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">AED 25<span className="text-sm text-muted-foreground">/mo</span></div>
                {selectedPlan === 'yearly' && (
                  <div className="mt-2 w-6 h-6 bg-foreground rounded-full flex items-center justify-center">
                    <Check className="h-4 w-4 text-background" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Monthly Plan */}
          <Card
            onClick={() => setSelectedPlan('monthly')}
            className={cn(
              "cursor-pointer transition-all",
              selectedPlan === 'monthly' && "border-primary ring-2 ring-primary"
            )}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Monthly Plan</h3>
                <p className="text-sm text-muted-foreground">Billed monthly</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">AED 40<span className="text-sm text-muted-foreground">/mo</span></div>
                {selectedPlan === 'monthly' && (
                  <div className="mt-2 w-6 h-6 bg-foreground rounded-full flex items-center justify-center">
                    <Check className="h-4 w-4 text-background" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Free Plan Option */}
          <button
            onClick={() => setSelectedPlan('free')}
            className={cn(
              "w-full text-center text-sm py-2 rounded-lg transition-colors",
              selectedPlan === 'free' ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Continue with Free
          </button>
        </div>

        {/* CTA Button */}
        <Button
          onClick={handleContinue}
          disabled={loading}
          className="w-full h-12 text-base font-semibold"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {selectedPlan === 'free' ? 'Continue Free' : `Upgrade to ${selectedPlan === 'yearly' ? 'Yearly' : 'Monthly'}`}
        </Button>

        {selectedPlan !== 'free' && (
          <p className="text-center text-sm text-muted-foreground">
            Cancel your plan anytime from Settings
          </p>
        )}

        {/* Footer Links */}
        <div className="flex justify-center gap-4 text-xs text-muted-foreground">
          <button className="hover:underline" onClick={() => navigate('/terms')}>
            Terms of service
          </button>
          <button className="hover:underline" onClick={() => navigate('/privacy')}>
            Privacy policy
          </button>
        </div>
      </div>
    </div>
  );
}
