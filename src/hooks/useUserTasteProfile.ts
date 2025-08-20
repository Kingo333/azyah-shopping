import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UserTasteProfile {
  id: string;
  user_id: string;
  category_preferences: Record<string, number>;
  brand_preferences: Record<string, number>;
  price_preferences: Record<string, number>;
  color_preferences: Record<string, number>;
  style_preferences: Record<string, number>;
  total_swipes: number;
  positive_swipes: number;
  negative_swipes: number;
  preference_confidence: number;
  last_updated_at: string;
  profile_created_at: string;
}

export const useUserTasteProfile = () => {
  const { user } = useAuth();

  const { data: tasteProfile, isLoading, error } = useQuery({
    queryKey: ['user-taste-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_taste_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data as UserTasteProfile | null;
    },
    enabled: !!user?.id
  });

  // Get insights from the taste profile
  const getTopPreferences = (preferences: Record<string, number>, limit = 5) => {
    return Object.entries(preferences)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([key, score]) => ({ name: key, score }));
  };

  const insights = tasteProfile ? {
    topCategories: getTopPreferences(tasteProfile.category_preferences),
    topBrands: getTopPreferences(tasteProfile.brand_preferences),
    pricePreferences: getTopPreferences(tasteProfile.price_preferences),
    swipeStats: {
      total: tasteProfile.total_swipes,
      positive: tasteProfile.positive_swipes,
      negative: tasteProfile.negative_swipes,
      likeRatio: tasteProfile.total_swipes > 0 ? 
        tasteProfile.positive_swipes / tasteProfile.total_swipes : 0
    },
    confidence: tasteProfile.preference_confidence,
    isWellTrained: tasteProfile.total_swipes >= 20 && tasteProfile.preference_confidence > 0.2
  } : null;

  return {
    tasteProfile,
    insights,
    isLoading,
    error,
    hasProfile: !!tasteProfile
  };
};