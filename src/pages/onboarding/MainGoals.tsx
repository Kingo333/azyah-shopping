import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, ShoppingBag, Sparkles, Shirt, Camera, Clock, Leaf, Eye } from 'lucide-react';

const goalOptions = [
  { value: 'shop_smarter', label: 'Shop smarter & save money', icon: ShoppingBag },
  { value: 'discover_styles', label: 'Discover new styles', icon: Sparkles },
  { value: 'track_wardrobe', label: 'Track my wardrobe', icon: Shirt },
  { value: 'ai_tryon', label: 'Try on with AI', icon: Camera },
  { value: 'save_time', label: 'Save time choosing outfits', icon: Clock },
  { value: 'sustainable', label: 'Explore sustainable fashion', icon: Leaf },
  { value: 'browsing', label: 'Just looking around', icon: Eye },
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress Bar */}
      <div className="w-full h-1 bg-muted">
        <div className="h-full bg-foreground transition-all" style={{ width: '28%' }} />
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
      <div className="flex-1 flex flex-col items-center p-6 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2 text-foreground">
              What do you want the most from Azyah?
            </h1>
          </div>

          <div className="space-y-3 mb-8">
            {goalOptions.map((option) => {
              const Icon = option.icon;
              return (
                <Card
                  key={option.value}
                  onClick={() => toggleGoal(option.value)}
                  className={`p-4 cursor-pointer transition-all ${
                    selected.includes(option.value)
                      ? 'border-foreground bg-accent'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <span className="text-base font-medium">{option.label}</span>
                  </div>
                </Card>
              );
            })}
          </div>

          <Button
            onClick={handleNext}
            disabled={selected.length === 0 || loading}
            className="w-full h-12 text-base font-semibold rounded-xl"
          >
            {loading ? 'Saving...' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}
