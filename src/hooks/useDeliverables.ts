import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { CreatorDeliverable, DeliverableStatus } from '@/types/ugc';

// Creator's deliverables for a specific collab or all
export const useCreatorDeliverables = (collabId?: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['creator-deliverables', user?.id, collabId],
    queryFn: async (): Promise<CreatorDeliverable[]> => {
      if (!user?.id) return [];
      
      let query = supabase
        .from('creator_deliverables')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });
      
      if (collabId) {
        query = query.eq('collab_id', collabId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as CreatorDeliverable[];
    },
    enabled: !!user?.id
  });
};

// Campaign deliverables for brand/retailer owners
export const useCampaignDeliverables = (collabId: string) => {
  return useQuery({
    queryKey: ['campaign-deliverables', collabId],
    queryFn: async (): Promise<CreatorDeliverable[]> => {
      const { data, error } = await supabase
        .from('creator_deliverables')
        .select('*')
        .eq('collab_id', collabId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as unknown as CreatorDeliverable[];
    },
    enabled: !!collabId
  });
};

// All deliverables for org owners (brand or retailer) - optional collab filter
export const useDeliverables = (ownerOrgId?: string, collabFilter?: string) => {
  return useQuery({
    queryKey: ['deliverables', ownerOrgId, collabFilter],
    queryFn: async (): Promise<CreatorDeliverable[]> => {
      let query = supabase
        .from('creator_deliverables')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (collabFilter) {
        query = query.eq('collab_id', collabFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as CreatorDeliverable[];
    }
  });
};

// Submit deliverable via RPC
export const useSubmitDeliverable = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      applicationId, 
      collabId, 
      platform, 
      postUrl, 
      screenshotPath 
    }: {
      applicationId: string;
      collabId: string;
      platform: string;
      postUrl: string;
      screenshotPath: string;
    }) => {
      const { data, error } = await supabase.rpc('submit_deliverable', {
        p_application_id: applicationId,
        p_collab_id: collabId,
        p_platform: platform,
        p_post_url: postUrl,
        p_screenshot_path: screenshotPath
      });
      
      if (error) throw error;
      
      const result = data?.[0];
      if (!result?.success) {
        throw new Error(result?.message || 'Failed to submit deliverable');
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-deliverables'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-deliverables'] });
      toast({
        title: 'Deliverable submitted',
        description: 'Your post has been submitted for review.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Submission failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
};

// Review deliverable via RPC (for brand owners)
export const useReviewDeliverable = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      deliverableId, 
      action, 
      notes 
    }: {
      deliverableId: string;
      action: 'approve' | 'revision_requested' | 'reject';
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc('review_deliverable', {
        p_deliverable_id: deliverableId,
        p_action: action,
        p_notes: notes || null
      });
      
      if (error) throw error;
      
      const result = data?.[0];
      if (!result?.success) {
        throw new Error(result?.message || 'Failed to review deliverable');
      }
      
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-deliverables'] });
      queryClient.invalidateQueries({ queryKey: ['creator-deliverables'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-payouts'] });
      
      const actionMessages = {
        approve: 'Deliverable approved',
        revision_requested: 'Revision requested',
        reject: 'Deliverable rejected'
      };
      
      toast({
        title: actionMessages[variables.action],
        description: variables.action === 'approve' 
          ? 'Payout has been created for the creator.'
          : 'The creator has been notified.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Review failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
};

// Get signed URL for screenshot (secure access)
export const useDeliverableScreenshot = (deliverableId: string) => {
  return useQuery({
    queryKey: ['deliverable-screenshot', deliverableId],
    queryFn: async (): Promise<string | null> => {
      // First get the path via RPC
      const { data: pathData, error: pathError } = await supabase.rpc(
        'get_deliverable_screenshot_path',
        { p_deliverable_id: deliverableId }
      );
      
      if (pathError || !pathData) return null;
      
      // Then create signed URL
      const { data: signedData, error: signedError } = await supabase.storage
        .from('deliverable-screenshots')
        .createSignedUrl(pathData, 3600); // 1 hour expiry
      
      if (signedError) return null;
      
      return signedData.signedUrl;
    },
    enabled: !!deliverableId,
    staleTime: 1000 * 60 * 30 // 30 minutes
  });
};

// Upload screenshot to storage
export const useUploadScreenshot = () => {
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      file, 
      collabId 
    }: { 
      file: File; 
      collabId: string;
    }): Promise<string> => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${collabId}/${Date.now()}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('deliverable-screenshots')
        .upload(fileName, file);
      
      if (error) throw error;
      
      return fileName;
    },
    onError: (error: Error) => {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
};
