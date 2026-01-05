import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/useSubscription';

const FREE_OUTFIT_LIMIT = 5;

export interface Fit {
  id: string;
  user_id: string;
  title: string | null;
  canvas_json: any;
  render_path: string | null;
  is_public: boolean;
  like_count: number;
  occasion: string | null;
  created_at: string;
  creator?: {
    id: string;
    username: string;
    avatar_url: string | null;
  } | null;
}

export interface FitItem {
  fit_id: string;
  wardrobe_item_id: string;
  z_index: number;
  transform: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
  };
}

// Get all fits for current user
export const useFits = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['fits', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('fits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Fit[];
    },
    enabled: !!user,
  });
};

// Get public fits (community)
export const usePublicFits = (limit = 20) => {
  return useQuery({
    queryKey: ['public-fits', limit],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('public-fits', {
        body: { sort: 'popular', limit, offset: 0 }
      });

      if (error) throw error;
      return data.fits || [];
    },
  });
};

// Save a new fit
export const useSaveFit = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (fitData: {
      title?: string;
      canvas_json: any;
      canvas_image_base64?: string;
      render_path?: string;
      is_public?: boolean;
      occasion?: string;
      gifted_to?: string;  // NEW
      context?: 'self' | 'friend';  // NEW
      items: Array<{
        wardrobe_item_id: string;
        z_index: number;
        transform: { x: number; y: number; scale: number; rotation: number };
      }>;
    }) => {
      if (!user) throw new Error('User not authenticated');

      // Call render-fit edge function if base64 provided
      let renderPath = fitData.render_path || 'placeholder.png';
      if (fitData.canvas_image_base64) {
        const { data: renderData, error: renderError } = await supabase.functions.invoke('render-fit', {
          body: { 
            canvas_json: fitData.canvas_json,
            canvas_image_base64: fitData.canvas_image_base64
          }
        });

        if (!renderError && renderData?.render_path) {
          renderPath = renderData.render_path;
        }
      }

      // Insert fit
      const { data: fit, error: fitError } = await supabase
        .from('fits')
        .insert({
          user_id: user.id,
          title: fitData.title,
          canvas_json: fitData.canvas_json,
          render_path: renderPath,
          is_public: fitData.is_public || false,
          occasion: fitData.occasion,
          gifted_to: fitData.gifted_to || null,  // NEW
          context: fitData.context || 'self',  // NEW
        })
        .select()
        .single();

      if (fitError) throw fitError;

      // Insert fit items
      if (fitData.items.length > 0) {
        const { error: itemsError } = await supabase
          .from('fit_items')
          .insert(
            fitData.items.map(item => ({
              fit_id: fit.id,
              ...item,
            }))
          );

        if (itemsError) throw itemsError;
      }

      return fit;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['fits'] });
      if (variables.gifted_to) {
        toast.success('Outfit saved for your friend!');
      } else {
        toast.success('Saved to My Fits. Share with friends?');
      }
    },
    onError: (error) => {
      console.error('Error saving fit:', error);
      toast.error('Failed to save fit');
    },
  });
};

// Delete a fit
export const useDeleteFit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('fits')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fits'] });
      toast.success('Fit deleted');
    },
    onError: (error) => {
      console.error('Error deleting fit:', error);
      toast.error('Failed to delete fit');
    },
  });
};

// Get fits gifted TO the current user (Made for You)
export const useGiftedFits = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['gifted-fits', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('fits')
        .select('*, user_id')
        .eq('gifted_to', user.id)
        .eq('context', 'friend') // Only friend gifts, not suggestions
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch creator profiles (using public_profiles table)
      const creatorIds = [...new Set(data.map(fit => fit.user_id))];
      const { data: profiles } = await supabase
        .from('public_profiles')
        .select('id, username, name, avatar_url')
        .in('id', creatorIds);
      
      return data.map(fit => ({
        ...fit,
        creator: profiles?.find(p => p.id === fit.user_id) || null,
      }));
    },
    enabled: !!user,
  });
};

// Get outfit suggestions submitted TO the current user
export const useSuggestionFits = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['suggestion-fits', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('fits')
        .select('*, user_id')
        .eq('gifted_to', user.id)
        .eq('context', 'suggestion')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch creator profiles (using public_profiles table)
      const creatorIds = [...new Set(data.map(fit => fit.user_id))];
      const { data: profiles } = await supabase
        .from('public_profiles')
        .select('id, username, name, avatar_url')
        .in('id', creatorIds);
      
      return data.map(fit => ({
        ...fit,
        creator: profiles?.find(p => p.id === fit.user_id) || null,
      }));
    },
    enabled: !!user,
  });
};

// Update a fit
export const useUpdateFit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Fit> }) => {
      const { data, error } = await supabase
        .from('fits')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fits'] });
      toast.success('Fit updated');
    },
    onError: (error) => {
      console.error('Error updating fit:', error);
      toast.error('Failed to update fit');
    },
  });
};

// Check outfit creation limit for free users
export const useFitsLimit = () => {
  const { user } = useAuth();
  const { isPremium } = useSubscription();

  return useQuery({
    queryKey: ['fits-limit', user?.id, isPremium],
    queryFn: async () => {
      if (!user) return { count: 0, limit: FREE_OUTFIT_LIMIT, canCreate: false, isPremium: false };
      
      if (isPremium) {
        return { count: 0, limit: Infinity, canCreate: true, isPremium: true };
      }

      const { count, error } = await supabase
        .from('fits')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (error) throw error;
      
      const currentCount = count || 0;
      return {
        count: currentCount,
        limit: FREE_OUTFIT_LIMIT,
        canCreate: currentCount < FREE_OUTFIT_LIMIT,
        isPremium: false,
        remaining: FREE_OUTFIT_LIMIT - currentCount,
      };
    },
    enabled: !!user,
  });
};
