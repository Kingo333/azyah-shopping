import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type StyleLinkEventType = 
  | 'page_view' 
  | 'outfit_click' 
  | 'item_click' 
  | 'shop_click' 
  | 'open_in_app_click'
  | 'install_attributed';

interface LogEventParams {
  username: string;
  eventType: StyleLinkEventType;
  targetSlug?: string;
  referrerUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface StyleLinkStats {
  page_views: number;
  outfit_clicks: number;
  item_clicks: number;
  shop_clicks: number;
  open_in_app_clicks: number;
  installs_attributed: number;
}

/**
 * Hook to log Style Link analytics events via secure RPC.
 * Safe for both anonymous and authenticated users.
 */
export const useLogStyleLinkEvent = () => {
  return useMutation({
    mutationFn: async ({ username, eventType, targetSlug, referrerUrl, metadata }: LogEventParams) => {
      const { error } = await supabase.rpc('log_style_link_event', {
        username_param: username,
        event_type_param: eventType,
        target_slug_param: targetSlug || null,
        referrer_url_param: referrerUrl || null,
        metadata_param: (metadata || {}) as Record<string, string | number | boolean | null>
      });

      if (error) {
        console.error('Error logging style link event:', error);
        // Don't throw - analytics should not block user experience
      }
    },
  });
};

/**
 * Hook to fetch Style Link stats for the page owner.
 * Only returns data if the authenticated user matches the owner_user_id.
 */
export const useStyleLinkStats = (ownerUserId: string | undefined) => {
  return useQuery({
    queryKey: ['style-link-stats', ownerUserId],
    queryFn: async (): Promise<StyleLinkStats> => {
      if (!ownerUserId) {
        return {
          page_views: 0,
          outfit_clicks: 0,
          item_clicks: 0,
          shop_clicks: 0,
          open_in_app_clicks: 0,
          installs_attributed: 0,
        };
      }

      const { data, error } = await supabase.rpc('get_style_link_stats', {
        owner_user_id_param: ownerUserId
      });

      if (error) {
        console.error('Error fetching style link stats:', error);
        throw error;
      }

      // Convert array of {event_type, count} to stats object
      const stats: StyleLinkStats = {
        page_views: 0,
        outfit_clicks: 0,
        item_clicks: 0,
        shop_clicks: 0,
        open_in_app_clicks: 0,
        installs_attributed: 0,
      };

      if (Array.isArray(data)) {
        data.forEach((row: { event_type: string; count: number }) => {
          switch (row.event_type) {
            case 'page_view':
              stats.page_views = row.count;
              break;
            case 'outfit_click':
              stats.outfit_clicks = row.count;
              break;
            case 'item_click':
              stats.item_clicks = row.count;
              break;
            case 'shop_click':
              stats.shop_clicks = row.count;
              break;
            case 'open_in_app_click':
              stats.open_in_app_clicks = row.count;
              break;
            case 'install_attributed':
              stats.installs_attributed = row.count;
              break;
          }
        });
      }

      return stats;
    },
    enabled: !!ownerUserId,
  });
};
