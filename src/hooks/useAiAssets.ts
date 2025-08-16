import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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

  const fetchAssets = async () => {
    if (!user) {
      console.log('[useAiAssets] No user available for fetching assets');
      setAssets([]);
      return;
    }
    
    // Check if we have a valid session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log('[useAiAssets] No valid session found');
      setAssets([]);
      return;
    }
    
    setLoading(true);
    try {
      console.log('[useAiAssets] Fetching assets for user:', user.id);
      
      const { data, error } = await supabase
        .from('ai_assets')
        .select('*')
        .eq('user_id', user.id)
        .eq('asset_type', 'tryon_result')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[useAiAssets] Database error fetching AI assets:', error);
        console.error('[useAiAssets] Error details:', { 
          code: error.code, 
          message: error.message, 
          details: error.details 
        });
        
        // Check if it's an auth-related error
        if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
          toast({
            title: 'Authentication Error',
            description: 'Please sign in again to view your AI assets.',
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'Database Error',
            description: 'Unable to fetch your AI assets. Please try refreshing the page.',
            variant: 'destructive'
          });
        }
        setAssets([]);
      } else {
        console.log('[useAiAssets] Successfully fetched', data?.length || 0, 'assets');
        setAssets(data || []);
      }
    } catch (error: any) {
      console.error('[useAiAssets] Network error fetching AI assets:', error);
      toast({
        title: 'Connection Error',
        description: 'Network error while fetching AI assets. Please check your connection and try again.',
        variant: 'destructive'
      });
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

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
    fetchAssets();
  }, [user]);

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