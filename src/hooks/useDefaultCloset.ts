import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateCloset } from './useClosets';

export const useDefaultCloset = () => {
  const { user } = useAuth();
  const createClosetMutation = useCreateCloset();

  const { data: defaultCloset, isLoading, error } = useQuery({
    queryKey: ['default_closet', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // First try to get existing default closet
      const { data: existingCloset, error: queryError } = await supabase
        .from('closets')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .single();

      if (queryError && queryError.code !== 'PGRST116') {
        throw queryError;
      }

      if (existingCloset) {
        return existingCloset;
      }

      // If no default closet exists, create one
      try {
        const newCloset = await createClosetMutation.mutateAsync({
          title: 'My Wardrobe',
          description: 'Your personal style collection',
          is_public: false
        });

        // Mark it as default
        const { data: updatedCloset, error: updateError } = await supabase
          .from('closets')
          .update({ is_default: true })
          .eq('id', newCloset.id)
          .select()
          .single();

        if (updateError) throw updateError;
        return updatedCloset;
      } catch (error) {
        console.error('Failed to create default closet:', error);
        throw error;
      }
    },
    enabled: !!user?.id,
    retry: 1
  });

  return {
    defaultCloset,
    isLoading,
    error,
    hasDefaultCloset: !!defaultCloset
  };
};