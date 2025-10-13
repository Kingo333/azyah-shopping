/**
 * @deprecated This component is no longer used in the onboarding flow.
 * Username is now collected during email signup in SignUp.tsx.
 * Kept for backward compatibility with existing users only.
 * DO NOT use in new features.
 * Planned for removal in v3.0
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Check, X } from 'lucide-react';

export default function UsernameSetup() {
  const [username, setUsername] = useState('');
  const [checking, setChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAvailability = async () => {
      if (username.length < 3) {
        setIsAvailable(null);
        return;
      }

      // Validate username format (alphanumeric + underscore only)
      const usernameRegex = /^[a-zA-Z0-9_]+$/;
      if (!usernameRegex.test(username)) {
        setIsAvailable(false);
        return;
      }

      setChecking(true);
      try {
        const { data, error } = await supabase
          .rpc('is_username_available', { check_username: username });

        if (error) throw error;
        setIsAvailable(data);
      } catch (error) {
        console.error('Error checking username:', error);
        setIsAvailable(null);
      } finally {
        setChecking(false);
      }
    };

    const timer = setTimeout(checkAvailability, 500);
    return () => clearTimeout(timer);
  }, [username]);

  const handleNext = async () => {
    if (!username || !isAvailable) {
      toast.error('Please choose an available username');
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
        .update({ username })
        .eq('id', user.id);

      if (error) throw error;

      navigate('/onboarding/suggested-items');
    } catch (error: any) {
      console.error('Error saving username:', error);
      if (error.code === '23505') {
        toast.error('Username is already taken');
      } else {
        toast.error('Failed to save username');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Progress Bar */}
      <div className="w-full h-1 bg-muted">
        <div className="h-full bg-foreground transition-all" style={{ width: '70%' }} />
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
              Create your username
            </h1>
            <p className="text-muted-foreground text-sm">
              You can change this anytime.
            </p>
          </div>

          <div className="mb-2">
            <div className="relative">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="username"
                className="h-14 rounded-xl text-base pr-12"
                maxLength={30}
              />
              {username.length >= 3 && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {checking ? (
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : isAvailable ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : (
                    <X className="h-5 w-5 text-red-500" />
                  )}
                </div>
              )}
            </div>
          </div>

          {username.length >= 3 && !checking && (
            <p className={`text-sm mb-4 ${isAvailable ? 'text-green-600' : 'text-red-600'}`}>
              {isAvailable ? '✅ Available' : '❌ Already taken or invalid'}
            </p>
          )}

          <Button
            onClick={handleNext}
            disabled={!username || !isAvailable || loading}
            className="w-full h-12 text-base font-semibold rounded-xl mt-4"
          >
            {loading ? 'Saving...' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}
