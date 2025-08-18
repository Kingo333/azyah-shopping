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
      let query = supabase
        .from('collaborations')
        .select(`
          *,
          brands (name, logo_url),
          retailers (name, logo_url)
        `);

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

      const { data, error } = await query;
      if (error) throw error;

      // Get application counts for each collaboration
      const collabIds = data?.map(c => c.id) || [];
      if (collabIds.length > 0) {
        const { data: applications } = await supabase
          .from('collab_applications')
          .select('collab_id')
          .in('collab_id', collabIds);

        const applicationCounts = applications?.reduce((acc, app) => {
          acc[app.collab_id] = (acc[app.collab_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        return (data?.map(collab => ({
          ...collab,
          applications_count: applicationCounts[collab.id] || 0,
          deliverables: collab.deliverables as Record<string, any>,
          platforms: collab.platforms as string[],
          talking_points: collab.talking_points as string[],
          brands: collab.brands && !('error' in collab.brands) ? collab.brands : undefined,
          retailers: collab.retailers && !('error' in collab.retailers) ? collab.retailers : undefined
        })) || []) as unknown as Collaboration[];
      }

      return (data?.map(collab => ({
        ...collab,
        applications_count: 0,
        deliverables: collab.deliverables as Record<string, any>,
        platforms: collab.platforms as string[],
        talking_points: collab.talking_points as string[],
        brands: collab.brands && !('error' in collab.brands) ? collab.brands : undefined,
        retailers: collab.retailers && !('error' in collab.retailers) ? collab.retailers : undefined
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
        .select(`
          *,
          brands (name, logo_url),
          retailers (name, logo_url)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data ? ({
        ...data,
        deliverables: data.deliverables as Record<string, any>,
        platforms: data.platforms as string[],
        talking_points: data.talking_points as string[],
        brands: data.brands && !('error' in data.brands) ? data.brands : undefined,
        retailers: data.retailers && !('error' in data.retailers) ? data.retailers : undefined
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
          collaborations (
            title,
            brands (name, logo_url),
            retailers (name, logo_url)
          )
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

export const useApplyToCollaboration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (application: Omit<Database['public']['Tables']['collab_applications']['Insert'], 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('collab_applications')
        .insert([application])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-applications'] });
      queryClient.invalidateQueries({ queryKey: ['collab-applications'] });
      toast({
        title: 'Application submitted',
        description: 'Your application has been submitted successfully.'
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