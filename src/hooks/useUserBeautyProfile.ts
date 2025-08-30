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

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['beauty-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('beauty_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data as BeautyProfile | null;
    },
    enabled: !!user?.id
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<BeautyProfile>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('beauty_profiles')
        .upsert({
          user_id: user.id,
          ...updates,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single();

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