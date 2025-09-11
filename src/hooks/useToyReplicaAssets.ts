import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/use-debounce';

export interface ToyReplicaAsset {
  id: string;
  user_id: string;
  source_url: string | null;
  result_url: string | null;
  status: string;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export const useToyReplicaAssets = () => {
  const [assets, setAssets] = useState<ToyReplicaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();
  const isRequestInProgress = useRef(false);
  const debouncedUser = useDebounce(user, 300);

  const fetchAssets = useCallback(async (isRetry = false) => {
    if (!debouncedUser) {
      console.log('[useToyReplicaAssets] No user available for fetching assets');
      setAssets([]);
      return;
    }
    
    // Prevent duplicate requests
    if (isRequestInProgress.current && !isRetry) {
      console.log('[useToyReplicaAssets] Request already in progress, skipping duplicate call');
      return;
    }
    
    isRequestInProgress.current = true;
    
    try {
      // Check if we have a valid session and refresh if needed
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.log('[useToyReplicaAssets] No valid session found, attempting to refresh');
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.log('[useToyReplicaAssets] Session refresh failed');
          setAssets([]);
          return;
        }
      }
      
      setLoading(true);
      console.log('[useToyReplicaAssets] Fetching assets for user:', debouncedUser.id);
      
      const { data, error } = await supabase
        .from('toy_replicas')
        .select('*')
        .eq('user_id', debouncedUser.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[useToyReplicaAssets] Database error fetching toy replica assets:', error);
        
        // Handle auth-related errors with retry
        if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
          if (retryCount < 2 && !isRetry) {
            console.log('[useToyReplicaAssets] Auth error, retrying with session refresh...');
            setRetryCount(prev => prev + 1);
            await supabase.auth.refreshSession();
            setTimeout(() => fetchAssets(true), 1000);
            return;
          } else {
            toast({
              title: 'Authentication Error',
              description: 'Please sign in again to view your toy replicas.',
              variant: 'destructive'
            });
          }
        } else {
          // Only show error toast if it's not a retry attempt
          if (!isRetry || retryCount === 0) {
            toast({
              title: 'Error Loading Toy Replicas',
              description: 'Unable to fetch your toy replicas. Retrying...',
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
        console.log('[useToyReplicaAssets] Successfully fetched', data?.length || 0, 'assets');
        setAssets(data || []);
        setRetryCount(0); // Reset retry count on success
      }
    } catch (error: any) {
      console.error('[useToyReplicaAssets] Network error fetching toy replica assets:', error);
      
      // Only show error toast and retry for actual network errors
      if (!isRetry || retryCount === 0) {
        toast({
          title: 'Connection Error',
          description: 'Network error while fetching toy replicas. Retrying...',
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

  useEffect(() => {
    if (debouncedUser) {
      fetchAssets();
    }
  }, [debouncedUser?.id]);

  const deleteAssets = async (assetIds: string[]) => {
    if (!user) {
      console.log('[useToyReplicaAssets] No user available for deleting assets');
      return false;
    }

    try {
      console.log('[useToyReplicaAssets] Deleting assets:', assetIds);
      
      const { error } = await supabase
        .from('toy_replicas')
        .delete()
        .in('id', assetIds)
        .eq('user_id', user.id); // Ensure users can only delete their own assets

      if (error) {
        console.error('[useToyReplicaAssets] Database error deleting assets:', error);
        throw error;
      }
      
      console.log('[useToyReplicaAssets] Assets deleted successfully');
      setAssets(prev => prev.filter(asset => !assetIds.includes(asset.id)));
      
      toast({
        title: 'Toy Replicas Deleted',
        description: `${assetIds.length} toy replica${assetIds.length > 1 ? 's' : ''} deleted successfully.`,
      });
      
      return true;
    } catch (error: any) {
      console.error('[useToyReplicaAssets] Error deleting assets:', error);
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete the selected toy replicas. Please try again.',
        variant: 'destructive'
      });
      return false;
    }
  };

  return {
    assets,
    loading,
    fetchAssets,
    deleteAssets
  };
};