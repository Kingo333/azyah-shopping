import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Star } from 'lucide-react';

export default function PlanSelection() {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | null>('yearly');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubscribe = async () => {
    if (!selectedPlan) return;

    setLoading(true);
    try {
      // TODO: Integrate with Stripe checkout
      // For now, just show a message and complete onboarding
      toast.info('Stripe integration coming soon. Starting with free plan.');
      await completeOnboarding();
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
      navigate('/auth');
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
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress Bar */}
      <div className="w-full h-1 bg-muted">
        <div className="h-full bg-foreground transition-all" style={{ width: '100%' }} />
      </div>

      {/* Back Button */}
      <div className="p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-4 text-foreground">
              Choose your plan
            </h1>
            
            {/* Review Snippet */}
            <div className="flex items-center justify-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <p className="text-sm text-muted-foreground italic">
              "Best fashion app for daily style inspiration!"
            </p>
          </div>

          <div className="space-y-4 mb-6">
            {/* Yearly Plan */}
            <Card
              onClick={() => setSelectedPlan('yearly')}
              className={`relative cursor-pointer transition-all ${
                selectedPlan === 'yearly'
                  ? 'border-foreground ring-2 ring-foreground'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">Yearly Plan</h3>
                    <p className="text-2xl font-bold mt-1">AED 300 <span className="text-sm font-normal text-muted-foreground">/year</span></p>
                  </div>
                  <div className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full font-semibold">
                    Most Popular
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Save AED 180 compared to monthly
                </p>
              </div>
            </Card>

            {/* Monthly Plan */}
            <Card
              onClick={() => setSelectedPlan('monthly')}
              className={`cursor-pointer transition-all ${
                selectedPlan === 'monthly'
                  ? 'border-foreground ring-2 ring-foreground'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <div className="p-4">
                <h3 className="font-semibold text-lg">Monthly Plan</h3>
                <p className="text-2xl font-bold mt-1">AED 40 <span className="text-sm font-normal text-muted-foreground">/month</span></p>
              </div>
            </Card>
          </div>

          <div className="space-y-3 mb-6">
            <Button
              onClick={handleSubscribe}
              disabled={!selectedPlan || loading}
              className="w-full h-12 text-base font-semibold rounded-xl"
            >
              {loading ? 'Processing...' : 'Continue'}
            </Button>

            <button
              onClick={handleContinueWithoutSubscription}
              disabled={loading}
              className="w-full text-muted-foreground hover:text-foreground transition-colors text-sm py-2"
            >
              Continue without subscription
            </button>
          </div>

          <div className="text-center text-xs text-muted-foreground space-x-2">
            <a href="/terms" className="hover:underline">Terms</a>
            <span>•</span>
            <a href="/privacy" className="hover:underline">Privacy</a>
            <span>•</span>
            <span>Cancel anytime</span>
          </div>
        </div>
      </div>
    </div>
  );
}
