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
  const { user } = useAuth();
  const { toast } = useToast();
  const isRequestInProgress = useRef(false);
  const retryCountRef = useRef(0);
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
          console.log('[useAiAssets] Session refresh failed — assets may have expired or session not ready');
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
        console.log('[useAiAssets] Background fetch failed (assets may have expired or auth not ready):', error.message);
        
        // One quiet retry after 1.5s — no toast, completely silent
        if (retryCountRef.current < 1 && !isRetry) {
          retryCountRef.current += 1;
          console.log('[useAiAssets] Scheduling 1 quiet retry in 1.5s...');
          await supabase.auth.refreshSession();
          setTimeout(() => fetchAssets(true), 1500);
          return;
        }
        
        // Give up silently — empty panel is fine (assets likely expired)
        console.log('[useAiAssets] Giving up after retry — showing empty results');
        setAssets([]);
      } else {
        console.log('[useAiAssets] Successfully fetched', data?.length || 0, 'assets');
        setAssets(data || []);
        retryCountRef.current = 0; // Reset on success
      }
    } catch (error: any) {
      console.log('[useAiAssets] Network error during background asset fetch (silent):', error?.message);
      
      // One quiet retry after 1.5s — no toast
      if (retryCountRef.current < 1 && !isRetry) {
        retryCountRef.current += 1;
        console.log('[useAiAssets] Scheduling 1 quiet retry in 1.5s...');
        setTimeout(() => fetchAssets(true), 1500);
        return;
      }
      
      // Give up silently
      console.log('[useAiAssets] Giving up after retry — showing empty results');
      setAssets([]);
    } finally {
      setLoading(false);
      isRequestInProgress.current = false;
    }
  }, [debouncedUser]); // retryCountRef is a ref — safe to omit from deps

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
      retryCountRef.current = 0;
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
      retryCountRef.current = 0; // Reset on new user
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
        .eq('user_id', user.id);

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
