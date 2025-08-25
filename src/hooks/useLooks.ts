import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface Look {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  tags: string[];
  occasion?: string;
  mood?: string;
  canvas: any;
  is_public: boolean;
  published_at?: string;
  cover_image_url?: string;
  created_at: string;
  updated_at: string;
  vote_count?: number;
  user_vote?: boolean;
}

export interface LookItem {
  id: string;
  look_id: string;
  closet_item_id?: string;
  product_snapshot: any;
  slot: {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    type: 'tall' | 'wide' | 'square' | 'free';
    size: 'S' | 'M' | 'L';
    mask?: 'rect' | 'round' | 'circle';
    padding?: number;
    rotation?: number;
  };
  z_index: number;
  created_at: string;
}

export interface LookTemplate {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  template_data: any;
  is_public: boolean;
  created_at: string;
}

// Hook to get user's looks
export const useLooks = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['looks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('looks')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as Look[];
    },
    enabled: !!user?.id
  });
};

// Hook to get public looks for explore
export const usePublicLooks = () => {
  return useQuery({
    queryKey: ['public_looks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('looks')
        .select(`
          *,
          users!inner (name, avatar_url),
          look_votes (voter_id)
        `)
        .eq('is_public', true)
        .order('published_at', { ascending: false });

      if (error) throw error;

      // Add vote counts and user vote status
      return data.map(look => ({
        ...look,
        vote_count: look.look_votes?.length || 0,
        user_vote: look.look_votes?.some((vote: any) => vote.voter_id === look.user_id) || false
      }));
    }
  });
};

// Hook to get a specific look with items
export const useLook = (lookId: string) => {
  return useQuery({
    queryKey: ['look', lookId],
    queryFn: async () => {
      if (!lookId) return null;

      const { data: look, error } = await supabase
        .from('looks')
        .select('*')
        .eq('id', lookId)
        .single();

      if (error) throw error;

      const { data: items, error: itemsError } = await supabase
        .from('look_items')
        .select('*')
        .eq('look_id', lookId)
        .order('z_index');

      if (itemsError) throw itemsError;

      return {
        ...look,
        items: items || []
      };
    },
    enabled: !!lookId
  });
};

// Hook to create a new look
export const useCreateLook = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ title, description, canvas }: { 
      title: string; 
      description?: string; 
      canvas: any;
    }) => {
      const { data, error } = await supabase
        .from('looks')
        .insert({
          user_id: user?.id,
          title,
          description,
          canvas
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['looks'] });
      toast({
        title: "Look created",
        description: "Your new look has been created successfully."
      });
    }
  });
};

// Hook to update a look
export const useUpdateLook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lookId, updates }: { 
      lookId: string; 
      updates: Partial<Look>;
    }) => {
      const { data, error } = await supabase
        .from('looks')
        .update(updates)
        .eq('id', lookId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['looks'] });
      queryClient.invalidateQueries({ queryKey: ['look', data.id] });
    }
  });
};

// Hook to publish a look
export const usePublishLook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      lookId, 
      title, 
      description, 
      tags, 
      occasion, 
      mood 
    }: { 
      lookId: string;
      title?: string;
      description?: string;
      tags?: string[];
      occasion?: string;
      mood?: string;
    }) => {
      const updates: any = {
        is_public: true,
        published_at: new Date().toISOString()
      };

      if (title) updates.title = title;
      if (description) updates.description = description;
      if (tags) updates.tags = tags;
      if (occasion) updates.occasion = occasion;
      if (mood) updates.mood = mood;

      const { data, error } = await supabase
        .from('looks')
        .update(updates)
        .eq('id', lookId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['looks'] });
      queryClient.invalidateQueries({ queryKey: ['public_looks'] });
      toast({
        title: "Look published",
        description: "Your look is now live in Explore!"
      });
    }
  });
};

// Hook to vote on a look
export const useVoteLook = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ lookId }: { lookId: string }) => {
      const { data, error } = await supabase
        .from('look_votes')
        .upsert({
          look_id: lookId,
          voter_id: user?.id,
          value: 1
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public_looks'] });
      toast({
        title: "Vote cast",
        description: "Thank you for voting!"
      });
    }
  });
};

// Hook to add item to look
export const useAddLookItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      lookId, 
      closetItemId, 
      productSnapshot, 
      slot, 
      zIndex 
    }: { 
      lookId: string;
      closetItemId?: string;
      productSnapshot: any;
      slot: any;
      zIndex: number;
    }) => {
      const { data, error } = await supabase
        .from('look_items')
        .insert({
          look_id: lookId,
          closet_item_id: closetItemId,
          product_snapshot: productSnapshot,
          slot,
          z_index: zIndex
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['look', data.look_id] });
    }
  });
};

// Hook to update look item
export const useUpdateLookItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      itemId, 
      updates 
    }: { 
      itemId: string;
      updates: Partial<LookItem>;
    }) => {
      const { data, error } = await supabase
        .from('look_items')
        .update(updates)
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['look', data.look_id] });
    }
  });
};

// Hook to remove item from look
export const useRemoveLookItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const { data: item } = await supabase
        .from('look_items')
        .select('look_id')
        .eq('id', itemId)
        .single();

      const { error } = await supabase
        .from('look_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      return item?.look_id;
    },
    onSuccess: (lookId) => {
      if (lookId) {
        queryClient.invalidateQueries({ queryKey: ['look', lookId] });
      }
    }
  });
};

// Hook to get templates
export const useTemplates = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['templates', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('look_templates')
        .select('*')
        .or(`user_id.eq.${user?.id},is_public.eq.true`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LookTemplate[];
    },
    enabled: !!user?.id
  });
};