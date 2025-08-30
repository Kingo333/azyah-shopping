import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();

  // Use direct API call since table not in types yet
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['beauty-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .rpc('get_beauty_profile', { target_user_id: user.id });

      if (error) {
        console.error('Error fetching beauty profile:', error);
        return null;
      }

      return data && data.length > 0 ? data[0] as BeautyProfile : null;
    },
    enabled: !!user?.id
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<BeautyProfile>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .rpc('upsert_beauty_profile', {
          target_user_id: user.id,
          profile_updates: updates
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beauty-profile', user?.id] });
    }
  });

  const hasValidProfile = profile && profile.skin_tone && profile.undertone;

  const getProfileSummary = () => {
    if (!hasValidProfile) return null;
    
    return {
      skinTone: profile.skin_tone,
      undertone: profile.undertone,
      faceShape: profile.face_shape,
      colorPalette: profile.color_palette || [],
      summary: profile.analysis_summary
    };
  };

  return {
    profile,
    isLoading,
    error,
    hasValidProfile,
    updateProfile: updateProfileMutation.mutate,
    isUpdating: updateProfileMutation.isPending,
    getProfileSummary
  };
};