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
    if (!user) return;
    
    setLoading(true);
    try {
      // Get today's date for filtering
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('ai_assets')
        .select('*')
        .eq('user_id', user.id)
        .eq('asset_type', 'tryon_result')
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching AI assets:', error);
        // Don't show toast error for failed asset loading
        setAssets([]);
      } else {
        setAssets(data || []);
      }
    } catch (error: any) {
      console.error('Error fetching AI assets:', error);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  const saveAsset = async (assetUrl: string, jobId?: string, title?: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('ai_assets')
        .insert([{
          user_id: user.id,
          job_id: jobId,
          asset_url: assetUrl,
          asset_type: 'tryon_result',
          title: title || `AI Try-On ${new Date().toLocaleDateString()}`
        }])
        .select()
        .single();

      if (error) throw error;
      
      setAssets(prev => [data, ...prev]);
      return data;
    } catch (error: any) {
      console.error('Error saving asset:', error);
      toast({
        description: 'Failed to save result',
        variant: 'destructive'
      });
      return null;
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [user]);

  return {
    assets,
    loading,
    fetchAssets,
    saveAsset
  };
};