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

const referralOptions = [
  'App Store',
  'TikTok',
  'Instagram',
  'ChatGPT',
  'Friends/Family',
  'Online Search',
  'Other',
];

export default function ReferralSource() {
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleNext = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Not authenticated');
        navigate('/onboarding/signup');
        return;
      }

      if (selected) {
        const { error } = await supabase
          .from('users')
          .update({ referral_source: selected })
          .eq('id', user.id);

        if (error) throw error;
      }

      navigate('/onboarding/date-of-birth');
    } catch (error) {
      console.error('Error saving referral:', error);
      toast.error('Failed to save selection');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/onboarding/date-of-birth');
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Progress Bar */}
      <div className="w-full h-1 bg-muted">
        <div className="h-full bg-foreground transition-all" style={{ width: '42%' }} />
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
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-6 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2 text-foreground">
              How did you find out about Azyah?
            </h1>
          </div>

          <div className="space-y-2 mb-6">
            {referralOptions.map((option) => (
              <Card
                key={option}
                onClick={() => setSelected(option)}
                className={`p-4 cursor-pointer transition-all ${
                  selected === option
                    ? 'border-foreground bg-accent'
                    : 'border-border hover:border-muted-foreground'
                }`}
              >
                <div className="flex items-center justify-center">
                  <span className="text-base font-medium">{option}</span>
                </div>
              </Card>
            ))}
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleNext}
              disabled={loading}
              className="w-full h-12 text-base font-semibold rounded-xl"
            >
              {loading ? 'Saving...' : selected ? 'Next' : 'Skip'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
