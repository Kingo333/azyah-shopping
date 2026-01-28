import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Collaboration, CollabApplication, CollabStatus, ApplicationStatus } from '@/types/ugc';
import type { Database } from '@/integrations/supabase/types';

export const useCollaborations = (userRole?: string, orgId?: string) => {
  return useQuery({
    queryKey: ['collaborations', userRole, orgId],
    queryFn: async (): Promise<Collaboration[]> => {
      // Get collaborations
      let query = supabase
        .from('collaborations')
        .select('*');

      // For shoppers, show only active public collaborations
      if (userRole === 'shopper') {
        query = query
          .eq('status', 'ACTIVE')
          .eq('visibility', 'public')
          .gte('application_deadline', new Date().toISOString());
      } 
      // For brands/retailers, show their own collaborations
      else if (orgId) {
        query = query.eq('owner_org_id', orgId);
      }

      query = query.order('created_at', { ascending: false });

      const { data: collaborations, error } = await query;
      if (error) throw error;

      // Get capacity data from view
      const collabIds = collaborations?.map(c => c.id) || [];
      let capacityMap: Record<string, any> = {};
      
      if (collabIds.length > 0) {
        const { data: capacityData } = await supabase
          .from('collab_capacity')
          .select('*')
          .in('collab_id', collabIds);
        
        capacityData?.forEach(cap => {
          capacityMap[cap.collab_id] = cap;
        });
      }

      // Get application counts
      let applicationCounts: Record<string, number> = {};
      if (collabIds.length > 0) {
        const { data: applications } = await supabase
          .from('collab_applications')
          .select('collab_id')
          .in('collab_id', collabIds);

        applicationCounts = applications?.reduce((acc, app) => {
          acc[app.collab_id] = (acc[app.collab_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};
      }

      return (collaborations?.map(collab => ({
        ...collab,
        applications_count: applicationCounts[collab.id] || 0,
        deliverables: collab.deliverables as Record<string, any>,
        platforms: collab.platforms as string[],
        talking_points: collab.talking_points as string[],
        // Add capacity data
        slots_filled: capacityMap[collab.id]?.slots_filled || 0,
        slots_remaining: capacityMap[collab.id]?.slots_remaining,
        waitlist_count: capacityMap[collab.id]?.waitlist_count || 0,
        base_payout_per_slot: capacityMap[collab.id]?.base_payout_per_slot
      })) || []) as unknown as Collaboration[];
    },
    enabled: !!userRole
  });
};

export const useCollaboration = (id: string) => {
  return useQuery({
    queryKey: ['collaboration', id],
    queryFn: async (): Promise<Collaboration | null> => {
      const { data, error } = await supabase
        .from('collaborations')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data ? ({
        ...data,
        deliverables: data.deliverables as Record<string, any>,
        platforms: data.platforms as string[],
        talking_points: data.talking_points as string[]
      } as unknown as Collaboration) : null;
    },
    enabled: !!id
  });
};

export const useCollabApplications = (collabId: string) => {
  return useQuery({
    queryKey: ['collab-applications', collabId],
    queryFn: async (): Promise<CollabApplication[]> => {
      const { data, error } = await supabase
        .from('collab_applications')
        .select(`
          *,
          users (name, avatar_url)
        `)
        .eq('collab_id', collabId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data?.map(app => ({
        ...app,
        social_links: app.social_links as Record<string, string>,
        users: app.users && !('error' in app.users) ? app.users : undefined
      })) || []) as unknown as CollabApplication[];
    },
    enabled: !!collabId
  });
};

export const useUserApplications = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-applications', user?.id],
    queryFn: async (): Promise<CollabApplication[]> => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('collab_applications')
        .select(`
          *,
          collaborations (id, title, total_budget, slots_total, currency, platforms, status)
        `)
        .eq('shopper_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data?.map(app => ({
        ...app,
        social_links: app.social_links as Record<string, string>
      })) || []) as unknown as CollabApplication[];
    },
    enabled: !!user?.id
  });
};

// Get user's application for a specific collab
export const useUserApplicationForCollab = (collabId: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-application', user?.id, collabId],
    queryFn: async (): Promise<CollabApplication | null> => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('collab_applications')
        .select('*')
        .eq('shopper_id', user.id)
        .eq('collab_id', collabId)
        .maybeSingle();

      if (error) throw error;
      return data ? ({
        ...data,
        social_links: data.social_links as Record<string, string>
      } as unknown as CollabApplication) : null;
    },
    enabled: !!user?.id && !!collabId
  });
};

// Get waitlist position
export const useWaitlistPosition = (collabId: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['waitlist-position', user?.id, collabId],
    queryFn: async (): Promise<number | null> => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase.rpc('get_waitlist_position', {
        p_collab_id: collabId
      });

      if (error) return null;
      return data;
    },
    enabled: !!user?.id && !!collabId
  });
};

export const useCreateCollaboration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (collaboration: Omit<Database['public']['Tables']['collaborations']['Insert'], 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('collaborations')
        .insert([collaboration])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborations'] });
      toast({
        title: 'Collaboration created',
        description: 'Your collaboration has been created successfully.'
      });
    }
  });
};

export const useUpdateCollaboration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Database['public']['Tables']['collaborations']['Update']> }) => {
      const { data, error } = await supabase
        .from('collaborations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborations'] });
      queryClient.invalidateQueries({ queryKey: ['collaboration'] });
      toast({
        title: 'Collaboration updated',
        description: 'Your collaboration has been updated successfully.'
      });
    }
  });
};

// Apply to collaboration via secure RPC
export const useApplyToCollaboration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      collab_id, 
      social_links, 
      note 
    }: { 
      collab_id: string; 
      social_links: Record<string, string>; 
      note?: string;
    }) => {
      const { data, error } = await supabase.rpc('apply_to_collab', {
        p_collab_id: collab_id,
        p_social_links: social_links,
        p_note: note || null
      });

      if (error) throw error;
      
      const result = data?.[0];
      if (result?.status === 'error') {
        throw new Error(result.message);
      }
      
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['user-applications'] });
      queryClient.invalidateQueries({ queryKey: ['user-application'] });
      queryClient.invalidateQueries({ queryKey: ['collab-applications'] });
      queryClient.invalidateQueries({ queryKey: ['collaborations'] });
      
      toast({
        title: result?.status === 'WAITLISTED' ? 'Added to Waitlist' : 'Application submitted',
        description: result?.message || 'Your application has been submitted successfully.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Application failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
};

export const useUpdateApplication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Database['public']['Tables']['collab_applications']['Update']> }) => {
      const { data, error } = await supabase
        .from('collab_applications')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collab-applications'] });
      queryClient.invalidateQueries({ queryKey: ['user-applications'] });
      toast({
        title: 'Application updated',
        description: 'Application has been updated successfully.'
      });
    }
  });
};