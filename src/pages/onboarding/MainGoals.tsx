/**
 * @deprecated This component is no longer used in the onboarding flow.
 * Kept for backward compatibility with existing users only.
 * DO NOT use in new features.
 * Planned for removal in v3.0
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

const goalOptions = [
  { value: 'track_wearing', label: 'Track what I\'m wearing', emoji: '👕' },
  { value: 'organize', label: 'Organize my clothes', emoji: '📦' },
  { value: 'insights', label: 'Wardrobe stats and insights', emoji: '📊' },
  { value: 'save_time', label: 'Save time choosing an outfit daily', emoji: '⏰' },
  { value: 'shop_smarter', label: 'Shop smarter and save money', emoji: '💰' },
  { value: 'create_discover', label: 'Create and discover outfits', emoji: '👗' },
  { value: 'browsing', label: 'Just looking around', emoji: '👀' },
];

export default function MainGoals() {
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const toggleGoal = (goal: string) => {
    setSelected(prev =>
      prev.includes(goal)
        ? prev.filter(g => g !== goal)
        : [...prev, goal]
    );
  };

  const handleNext = async () => {
    if (selected.length === 0) {
      toast.error('Please select at least one goal');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Not authenticated');
        navigate('/auth');
        return;
      }

      const { error } = await supabase
        .from('users')
        .update({ main_goals: selected })
        .eq('id', user.id);

      if (error) throw error;

      navigate('/onboarding/referral-source');
    } catch (error) {
      console.error('Error saving goals:', error);
      toast.error('Failed to save selection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Progress Bar */}
      <div className="w-full h-1 bg-muted">
        <div className="h-full bg-foreground transition-all" style={{ width: '14%' }} />
      </div>

      {/* Back Button */}
      <div className="p-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-6 pb-6 overflow-y-auto">
        <div className="w-full max-w-md mx-auto">
          <div className="mb-4">
            <h1 className="text-2xl font-bold mb-2 text-foreground">
              What do you want the most from Azyah?
            </h1>
          </div>

          <div className="space-y-2 mb-4">
            {goalOptions.map((option) => (
              <Card
                key={option.value}
                onClick={() => toggleGoal(option.value)}
                className={`p-4 cursor-pointer transition-all ${
                  selected.includes(option.value)
                    ? 'border-foreground bg-accent'
                    : 'border-border hover:border-muted-foreground bg-muted/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{option.emoji}</span>
                  <span className="text-base font-medium">{option.label}</span>
                </div>
              </Card>
            ))}
          </div>

          <Button
            onClick={handleNext}
            disabled={selected.length === 0 || loading}
            className="w-full h-12 text-base font-semibold rounded-xl bg-muted-foreground hover:bg-muted-foreground/90"
          >
            {loading ? 'Saving...' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}
