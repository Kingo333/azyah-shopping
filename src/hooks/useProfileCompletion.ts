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
        const userRole = user.user_metadata?.role;

        if (userRole === 'brand') {
          await checkBrandCompletion();
        } else if (userRole === 'retailer') {
          await checkRetailerCompletion();
        } else {
          await checkShopperCompletion();
        }
      } catch (error) {
        console.error('Error checking profile completion:', error);
        setCompletion({ percentage: 0, missingFields: [], isComplete: true, isLoading: false });
      }
    };

    const checkBrandCompletion = async () => {
      const { data: brand } = await supabase
        .from('brands')
        .select('name, logo_url, bio, website, contact_email, socials')
        .eq('owner_user_id', user.id)
        .single();

      if (!brand) {
        setCompletion({ percentage: 0, missingFields: ['Brand Profile'], isComplete: false, isLoading: false });
        return;
      }

      const fields = {
        name: { value: brand.name, weight: 20, label: 'Brand Name' },
        logo_url: { value: brand.logo_url, weight: 25, label: 'Logo' },
        bio: { value: brand.bio, weight: 20, label: 'Bio' },
        website: { value: brand.website, weight: 15, label: 'Website' },
        contact_email: { value: brand.contact_email, weight: 20, label: 'Contact Email' }
      };

      calculateCompletion(fields);
    };

    const checkRetailerCompletion = async () => {
      const { data: retailer } = await supabase
        .from('retailers')
        .select('name, logo_url, bio, website, contact_email, socials')
        .eq('owner_user_id', user.id)
        .single();

      if (!retailer) {
        setCompletion({ percentage: 0, missingFields: ['Retailer Profile'], isComplete: false, isLoading: false });
        return;
      }

      const fields = {
        name: { value: retailer.name, weight: 20, label: 'Store Name' },
        logo_url: { value: retailer.logo_url, weight: 25, label: 'Logo' },
        bio: { value: retailer.bio, weight: 20, label: 'Bio' },
        website: { value: retailer.website, weight: 15, label: 'Website' },
        contact_email: { value: retailer.contact_email, weight: 20, label: 'Contact Email' }
      };

      calculateCompletion(fields);
    };

    const checkShopperCompletion = async () => {
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

      calculateCompletion(fields);
    };

    const calculateCompletion = (fields: Record<string, { value: any; weight: number; label: string }>) => {
      let totalScore = 0;
      const missing: string[] = [];

      Object.entries(fields).forEach(([key, field]) => {
        const hasValue = field.value && (typeof field.value === 'string' ? field.value.trim() !== '' : true);
        if (hasValue) {
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
    };

    checkProfileCompletion();
  }, [user]);

  return completion;
}
