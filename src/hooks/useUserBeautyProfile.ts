import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface BeautyProfile {
  id: string;
  user_id: string;
  skin_tone: string | null;
  undertone: string | null;
  face_shape: string | null;
  color_palette: string[] | null;
  selfie_url: string | null;
  analysis_summary: string | null;
  created_at: string;
  updated_at: string;
}

export const useUserBeautyProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<BeautyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .rpc('get_beauty_profile', { target_user_id: user.id });

      if (error) throw error;

      if (data && data.length > 0) {
        setProfile(data[0] as BeautyProfile);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error('Error fetching beauty profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch profile');
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const updateProfile = useCallback(async (updates: Partial<BeautyProfile>) => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .rpc('upsert_beauty_profile', {
          target_user_id: user.id,
          profile_updates: updates
        });

      if (error) throw error;
      
      // Refetch profile after update
      await fetchProfile();
    } catch (err) {
      console.error('Error updating beauty profile:', err);
      throw err;
    }
  }, [user?.id, fetchProfile]);

  const hasValidProfile = profile && profile.skin_tone && profile.undertone;

  const getProfileSummary = useCallback(() => {
    if (!hasValidProfile) return null;
    
    return {
      skinTone: profile.skin_tone,
      undertone: profile.undertone,
      faceShape: profile.face_shape,
      colorPalette: profile.color_palette || [],
      summary: profile.analysis_summary
    };
  }, [profile, hasValidProfile]);

  return {
    profile,
    isLoading,
    error,
    hasValidProfile,
    updateProfile,
    fetchProfile,
    getProfileSummary
  };
};