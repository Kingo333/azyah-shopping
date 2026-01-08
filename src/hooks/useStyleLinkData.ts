import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface StyleLinkSocials {
  instagram_url?: string;
  tiktok_url?: string;
  twitter_url?: string;
  website?: string;
}

export interface StyleLinkUserData {
  user_id: string;
  username: string | null;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  referral_code: string | null;
  socials: StyleLinkSocials | null;
}

export interface StyleLinkOutfit {
  id: string;
  share_slug: string | null;
  title: string | null;
  image_preview: string | null;
  render_path: string | null;
  created_at: string;
  like_count: number;
  comment_count: number;
}

export const useStyleLinkData = (identifier: string | undefined) => {
  const { user } = useAuth();

  // Fetch user profile data via RPC (accepts username OR UUID)
  const userDataQuery = useQuery({
    queryKey: ['style-link-user', identifier],
    queryFn: async (): Promise<StyleLinkUserData | null> => {
      if (!identifier) return null;

      const { data, error } = await supabase.rpc('get_user_style_link_data', {
        identifier_param: identifier
      });

      if (error) {
        console.error('Error fetching style link user data:', error);
        throw error;
      }

      // RPC returns an array, get first item
      const rawData = Array.isArray(data) ? data[0] : data;
      if (!rawData) return null;
      
      // Cast socials to proper type (it comes as Json from Supabase)
      return {
        ...rawData,
        socials: rawData.socials as StyleLinkSocials | null,
      } as StyleLinkUserData;
    },
    enabled: !!identifier,
  });

  // Fetch user's public outfits
  const outfitsQuery = useQuery({
    queryKey: ['style-link-outfits', userDataQuery.data?.user_id],
    queryFn: async (): Promise<StyleLinkOutfit[]> => {
      if (!userDataQuery.data?.user_id) return [];

      const { data, error } = await supabase
        .from('fits')
        .select('id, share_slug, title, image_preview, render_path, created_at, like_count, comment_count')
        .eq('user_id', userDataQuery.data.user_id)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching public outfits:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!userDataQuery.data?.user_id,
  });

  // Determine if the current viewer is the page owner
  const isOwner = user?.id === userDataQuery.data?.user_id;

  return {
    userData: userDataQuery.data,
    outfits: outfitsQuery.data || [],
    isOwner,
    isLoading: userDataQuery.isLoading || outfitsQuery.isLoading,
    isError: userDataQuery.isError || outfitsQuery.isError,
    error: userDataQuery.error || outfitsQuery.error,
  };
};
