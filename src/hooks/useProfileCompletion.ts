import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ProfileCompletionData {
  percentage: number;
  missingFields: string[];
  isComplete: boolean;
  isLoading: boolean;
}

export function useProfileCompletion() {
  const { user } = useAuth();
  const [completion, setCompletion] = useState<ProfileCompletionData>({
    percentage: 0,
    missingFields: [],
    isComplete: true,
    isLoading: true
  });

  useEffect(() => {
    if (!user) {
      setCompletion({ percentage: 0, missingFields: [], isComplete: true, isLoading: false });
      return;
    }

    const checkProfileCompletion = async () => {
      try {
        // Get user profile data
        const { data: profile } = await supabase
          .from('users')
          .select('name, avatar_url, bio, country, website')
          .eq('id', user.id)
          .single();

        if (!profile) {
          setCompletion({ percentage: 0, missingFields: [], isComplete: true, isLoading: false });
          return;
        }

        const fields = {
          name: { value: profile.name, weight: 25, label: 'Display Name' },
          avatar_url: { value: profile.avatar_url, weight: 20, label: 'Profile Picture' },
          bio: { value: profile.bio, weight: 20, label: 'Bio' },
          country: { value: profile.country, weight: 15, label: 'Country' },
          website: { value: profile.website, weight: 20, label: 'Website' }
        };

        let totalScore = 0;
        const missing: string[] = [];

        Object.entries(fields).forEach(([key, field]) => {
          if (field.value && field.value.trim() !== '') {
            totalScore += field.weight;
          } else {
            missing.push(field.label);
          }
        });

        const percentage = Math.round(totalScore);
        const isComplete = percentage >= 80;

        setCompletion({
          percentage,
          missingFields: missing,
          isComplete,
          isLoading: false
        });
      } catch (error) {
        console.error('Error checking profile completion:', error);
        setCompletion({ percentage: 0, missingFields: [], isComplete: true, isLoading: false });
      }
    };

    checkProfileCompletion();
  }, [user]);

  return completion;
}