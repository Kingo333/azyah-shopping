import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ActivityEvent {
  id: string;
  type: 'view' | 'click' | 'wishlist' | 'like';
  product_title: string;
  timestamp: string;
  time_ago: string;
  count?: number;
}

export const useRealtimeActivity = (brandId?: string, retailerId?: string, limit: number = 10) => {
  return useQuery({
    queryKey: ['realtime-activity', brandId, retailerId, limit],
    queryFn: async (): Promise<ActivityEvent[]> => {
      console.log('Fetching realtime activity for:', { brandId, retailerId });
      
      // Get recent events
      let eventsQuery = supabase
        .from('events')
        .select('id, event_type, created_at, product_id')
        .order('created_at', { ascending: false })
        .limit(limit * 2); // Get more to filter

      if (brandId) {
        eventsQuery = eventsQuery.eq('brand_id', brandId);
      } else if (retailerId) {
        eventsQuery = eventsQuery.eq('retailer_id', retailerId);
      }

      const { data: events, error: eventsError } = await eventsQuery;
      
      if (eventsError) {
        console.error('Error fetching events:', eventsError);
        return [];
      }

      // Get recent likes and their products
      const { data: likes } = await supabase
        .from('likes')
        .select('id, created_at, product_id')
        .order('created_at', { ascending: false })
        .limit(limit);

      // Get recent wishlist adds  
      const { data: wishlistAdds } = await supabase
        .from('wishlist_items')
        .select('id, added_at, product_id')
        .order('added_at', { ascending: false })
        .limit(limit);

      // Get product titles for all product IDs
      const allProductIds = [
        ...(events?.map(e => e.product_id).filter(Boolean) || []),
        ...(likes?.map(l => l.product_id).filter(Boolean) || []),
        ...(wishlistAdds?.map(w => w.product_id).filter(Boolean) || [])
      ];

      const { data: products } = await supabase
        .from('products')
        .select('id, title')
        .in('id', [...new Set(allProductIds)]);

      const productTitles: Record<string, string> = {};
      products?.forEach(p => {
        productTitles[p.id] = p.title;
      });

      // Combine and format all activities
      const activities: ActivityEvent[] = [];

      // Add events
      events?.forEach(event => {
        if (event.product_id && productTitles[event.product_id]) {
          let type: ActivityEvent['type'] = 'view';
          if (event.event_type === 'product_view') type = 'view';
          else if (event.event_type === 'product_click') type = 'click';

          activities.push({
            id: `event-${event.id}`,
            type,
            product_title: productTitles[event.product_id],
            timestamp: event.created_at,
            time_ago: getTimeAgo(event.created_at)
          });
        }
      });

      // Add likes
      likes?.forEach(like => {
        if (like.product_id && productTitles[like.product_id]) {
          activities.push({
            id: `like-${like.id}`,
            type: 'like',
            product_title: productTitles[like.product_id],
            timestamp: like.created_at,
            time_ago: getTimeAgo(like.created_at)
          });
        }
      });

      // Add wishlist adds
      wishlistAdds?.forEach(wishlist => {
        if (wishlist.product_id && productTitles[wishlist.product_id]) {
          activities.push({
            id: `wishlist-${wishlist.id}`,
            type: 'wishlist',
            product_title: productTitles[wishlist.product_id],
            timestamp: wishlist.added_at,
            time_ago: getTimeAgo(wishlist.added_at)
          });
        }
      });

      // Sort by timestamp and merge duplicates with counts
      const sortedActivities = activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Merge activities by type and product
      const mergedActivities: (ActivityEvent & { count: number })[] = [];
      const activityMap = new Map<string, ActivityEvent & { count: number }>();

      sortedActivities.forEach(activity => {
        const key = `${activity.type}-${activity.product_title}`;
        if (activityMap.has(key)) {
          const existing = activityMap.get(key)!;
          existing.count += 1;
          // Keep the most recent timestamp
          if (new Date(activity.timestamp) > new Date(existing.timestamp)) {
            existing.timestamp = activity.timestamp;
            existing.time_ago = activity.time_ago;
          }
        } else {
          activityMap.set(key, { ...activity, count: 1 });
        }
      });

      // Convert back to array and sort by timestamp
      const recentActivities = Array.from(activityMap.values())
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);

      console.log('Recent activities (merged):', recentActivities);
      return recentActivities;
    },
    enabled: !!(brandId || retailerId),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000, // 15 seconds
    retry: 2
  });
};

function getTimeAgo(timestamp: string): string {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now.getTime() - past.getTime();
  
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
}