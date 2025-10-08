import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X, Star } from 'lucide-react';

export default function PlanSelection() {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | null>('yearly');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleContinue = async () => {
    if (!selectedPlan) {
      await handleContinueWithoutSubscription();
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

      // Call Stripe checkout edge function
      const { data, error } = await supabase.functions.invoke('create-stripe-checkout', {
        body: { plan_type: selectedPlan }
      });

      if (error) throw error;

      if (data?.checkout_url) {
        // Redirect to Stripe checkout
        window.location.href = data.checkout_url;
      } else {
        // Fallback if Stripe not configured yet
        toast.info('Payment system setup in progress. Starting with free plan for now.');
        await completeOnboarding();
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast.error('Failed to create subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueWithoutSubscription = async () => {
    setLoading(true);
    try {
      await completeOnboarding();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = async () => {
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

    toast.success('Welcome to Azyah! 🎉');
    navigate('/swipe');
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Progress Bar */}
      <div className="w-full h-1 bg-foreground">
        <div className="h-full bg-foreground transition-all" style={{ width: '100%' }} />
      </div>

      {/* Header with Close */}
      <div className="p-4 flex justify-end">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/swipe')}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-6 text-foreground">
              Choose your plan
            </h1>
            
            {/* Review Snippet */}
            <div className="flex items-center justify-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <p className="text-sm text-muted-foreground italic mb-8">
              "I downloaded a few similar apps to choose the best one and this is definitely it!! 💕💕💕"
            </p>
            <p className="text-xs text-muted-foreground text-right">
              yasisa
            </p>
          </div>

          {/* Trial Toggle */}
          <div className="bg-muted/30 rounded-xl p-4 flex items-center justify-between mb-6">
            <span className="text-sm">Not sure yet? Enable trial.</span>
            <div className="w-12 h-6 bg-muted rounded-full relative cursor-pointer">
              <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 transition-transform"></div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            {/* Yearly Plan */}
            <Card
              onClick={() => setSelectedPlan('yearly')}
              className={`cursor-pointer transition-all relative ${
                selectedPlan === 'yearly'
                  ? 'border-foreground ring-2 ring-foreground bg-accent'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-black text-white px-3 py-1 rounded-full text-xs font-bold">
                MOST POPULAR
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">Yearly Plan</h3>
                  <p className="text-sm text-muted-foreground">12 mo • AED 300</p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold">AED 25 /mo</div>
                  {selectedPlan === 'yearly' && (
                    <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center mt-1">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Monthly Plan */}
            <Card
              onClick={() => setSelectedPlan('monthly')}
              className={`cursor-pointer transition-all ${
                selectedPlan === 'monthly'
                  ? 'border-foreground ring-2 ring-foreground bg-accent'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">Monthly</h3>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold">AED 40 /mo</div>
                  {selectedPlan === 'monthly' && (
                    <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center mt-1">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          <Button
            onClick={handleContinue}
            disabled={loading}
            className="w-full h-12 text-base font-semibold rounded-xl bg-black hover:bg-black/90 text-white mb-4"
          >
            {loading ? 'Processing...' : 'Continue'}
          </Button>

          <p className="text-center text-sm text-muted-foreground mb-4">
            Cancel your plan any time.
          </p>

          <div className="flex justify-center gap-4 text-xs text-muted-foreground">
            <button className="underline">Restore purchase</button>
            <button className="underline">Terms of service</button>
            <button className="underline">Privacy policy</button>
          </div>
        </div>
      </div>
    </div>
  );
}
