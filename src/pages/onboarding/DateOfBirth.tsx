import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

export default function DateOfBirth() {
  const [date, setDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleNext = async () => {
    if (!date) {
      toast.error('Please select your date of birth');
      return;
    }

    // Check minimum age (13 years)
    const today = new Date();
    const minDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
    
    if (date > minDate) {
      toast.error('You must be at least 13 years old to use Azyah');
      return;
    }

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
        .update({ date_of_birth: date.toISOString().split('T')[0] })
        .eq('id', user.id);

      if (error) throw error;

      navigate('/onboarding/username-setup');
    } catch (error) {
      console.error('Error saving date of birth:', error);
      toast.error('Failed to save date of birth');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress Bar */}
      <div className="w-full h-1 bg-muted">
        <div className="h-full bg-foreground transition-all" style={{ width: '56%' }} />
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
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2 text-foreground">
              Add your date of birth
            </h1>
            <p className="text-muted-foreground text-sm">
              This won't appear on your profile — we just need to ensure you're old enough.
            </p>
          </div>

          <div className="mb-8">
            <input
              type="date"
              value={date ? date.toISOString().split('T')[0] : ''}
              onChange={(e) => setDate(e.target.value ? new Date(e.target.value) : null)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full h-14 px-4 rounded-xl border border-border bg-background text-foreground text-center text-lg"
            />
          </div>

          <Button
            onClick={handleNext}
            disabled={!date || loading}
            className="w-full h-12 text-base font-semibold rounded-xl"
          >
            {loading ? 'Saving...' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}
