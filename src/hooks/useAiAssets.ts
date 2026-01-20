import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/use-debounce';

export interface AiAsset {
  id: string;
  user_id: string;
  job_id: string | null;
  asset_url: string;
  asset_type: string;
  title: string | null;
  created_at: string;
}

export const useAiAssets = () => {
  const [assets, setAssets] = useState<AiAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();
  const isRequestInProgress = useRef(false);
  const debouncedUser = useDebounce(user, 300);

  const fetchAssets = useCallback(async (isRetry = false) => {
    if (!debouncedUser) {
      console.log('[useAiAssets] No user available for fetching assets');
      setAssets([]);
      return;
    }
    
    // Prevent duplicate requests
    if (isRequestInProgress.current && !isRetry) {
      console.log('[useAiAssets] Request already in progress, skipping duplicate call');
      return;
    }
    
    isRequestInProgress.current = true;
    
    try {
      // Check if we have a valid session and refresh if needed
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.log('[useAiAssets] No valid session found, attempting to refresh');
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.log('[useAiAssets] Session refresh failed');
          setAssets([]);
          return;
        }
      }
      
      setLoading(true);
      console.log('[useAiAssets] Fetching assets for user:', debouncedUser.id);
      
      const { data, error } = await supabase
        .from('ai_assets')
        .select('*')
        .eq('user_id', debouncedUser.id)
        .in('asset_type', ['tryon_result', 'tryon_video'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[useAiAssets] Database error fetching AI assets:', error);
        
        // Handle auth-related errors with retry
        if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
          if (retryCount < 2 && !isRetry) {
            console.log('[useAiAssets] Auth error, retrying with session refresh...');
            setRetryCount(prev => prev + 1);
            await supabase.auth.refreshSession();
            setTimeout(() => fetchAssets(true), 1000);
            return;
          } else {
            toast({
              title: 'Authentication Error',
              description: 'Please sign in again to view your AI assets.',
              variant: 'destructive'
            });
          }
        } else {
          // Only show error toast if it's not a retry attempt
          if (!isRetry || retryCount === 0) {
            toast({
              title: 'Error Loading Assets',
              description: 'Unable to fetch your AI assets. Retrying...',
              variant: 'destructive'
            });
          }
          
          // Retry logic for network errors
          if (retryCount < 3) {
            setRetryCount(prev => prev + 1);
            setTimeout(() => fetchAssets(true), 2000 * (retryCount + 1));
            return;
          }
        }
        setAssets([]);
      } else {
        console.log('[useAiAssets] Successfully fetched', data?.length || 0, 'assets');
        setAssets(data || []);
        setRetryCount(0); // Reset retry count on success
      }
    } catch (error: any) {
      console.error('[useAiAssets] Network error fetching AI assets:', error);
      
      // Only show error toast and retry for actual network errors
      if (!isRetry || retryCount === 0) {
        toast({
          title: 'Connection Error',
          description: 'Network error while fetching AI assets. Retrying...',
          variant: 'destructive'
        });
      }
      
      if (retryCount < 3) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => fetchAssets(true), 2000 * (retryCount + 1));
        return;
      }
      
      setAssets([]);
    } finally {
      setLoading(false);
      isRequestInProgress.current = false;
    }
  }, [debouncedUser, retryCount, toast]);

  const saveAsset = async (assetUrl: string, jobId?: string, title?: string) => {
    if (!user) {
      console.log('[useAiAssets] No user available for saving asset');
      return null;
    }

    try {
      console.log('[useAiAssets] Saving asset:', { assetUrl, jobId, title, userId: user.id });
      
      const assetData = {
        user_id: user.id,
        job_id: jobId,
        asset_url: assetUrl,
        asset_type: 'tryon_result',
        title: title || `AI Try-On ${new Date().toLocaleDateString()}`
      };

      const { data, error } = await supabase
        .from('ai_assets')
        .insert([assetData])
        .select()
        .single();

      if (error) {
        console.error('[useAiAssets] Database error saving asset:', error);
        throw error;
      }
      
      console.log('[useAiAssets] Asset saved successfully:', data);
      setAssets(prev => [data, ...prev]);
      setRetryCount(0); // Reset retry count on successful save
      return data;
    } catch (error: any) {
      console.error('[useAiAssets] Error saving asset:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save the AI result. Please try again.',
        variant: 'destructive'
      });
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    if (debouncedUser && isMounted) {
      fetchAssets();
    }

    return () => {
      isMounted = false;
    };
  }, [debouncedUser?.id]); // Only depend on user ID

  const deleteAssets = async (assetIds: string[]) => {
    if (!user) {
      console.log('[useAiAssets] No user available for deleting assets');
      return false;
    }

    try {
      console.log('[useAiAssets] Deleting assets:', assetIds);
      
      const { error } = await supabase
        .from('ai_assets')
        .delete()
        .in('id', assetIds)
        .eq('user_id', user.id); // Ensure users can only delete their own assets

      if (error) {
        console.error('[useAiAssets] Database error deleting assets:', error);
        throw error;
      }
      
      console.log('[useAiAssets] Assets deleted successfully');
      setAssets(prev => prev.filter(asset => !assetIds.includes(asset.id)));
      
      toast({
        title: 'Assets Deleted',
        description: `${assetIds.length} image${assetIds.length > 1 ? 's' : ''} deleted successfully.`,
      });
      
      return true;
    } catch (error: any) {
      console.error('[useAiAssets] Error deleting assets:', error);
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete the selected images. Please try again.',
        variant: 'destructive'
      });
      return false;
    }
  };

  return {
    assets,
    loading,
    fetchAssets,
    saveAsset,
    deleteAssets
  };
};