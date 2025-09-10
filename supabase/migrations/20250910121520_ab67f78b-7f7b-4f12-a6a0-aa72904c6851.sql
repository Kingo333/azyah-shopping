-- Create analytics functions for server-side processing

-- Function to get user analytics summary (preferences, activity stats)
CREATE OR REPLACE FUNCTION public.get_user_analytics_summary(target_user_id uuid)
RETURNS TABLE(
  total_swipes bigint,
  positive_swipes bigint,
  negative_swipes bigint,
  wishlist_actions bigint,
  top_categories jsonb,
  top_brands jsonb,
  recent_activity jsonb,
  preference_confidence numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow users to access their own analytics
  IF target_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: You can only access your own analytics';
  END IF;
  
  RETURN QUERY
  SELECT 
    COUNT(*) as total_swipes,
    COUNT(*) FILTER (WHERE action IN ('right', 'up')) as positive_swipes,
    COUNT(*) FILTER (WHERE action = 'left') as negative_swipes,
    COUNT(*) FILTER (WHERE action = 'up') as wishlist_actions,
    
    -- Top categories from recent swipes
    COALESCE(
      (SELECT jsonb_object_agg(category_slug, category_count)
       FROM (
         SELECT p.category_slug, COUNT(*) as category_count
         FROM swipes s
         JOIN products p ON p.id = s.product_id
         WHERE s.user_id = target_user_id 
           AND s.action IN ('right', 'up')
           AND s.created_at > NOW() - INTERVAL '30 days'
         GROUP BY p.category_slug
         ORDER BY category_count DESC
         LIMIT 5
       ) top_cats),
      '{}'::jsonb
    ) as top_categories,
    
    -- Top brands from recent swipes  
    COALESCE(
      (SELECT jsonb_object_agg(brand_name, brand_count)
       FROM (
         SELECT b.name as brand_name, COUNT(*) as brand_count
         FROM swipes s
         JOIN products p ON p.id = s.product_id
         JOIN brands b ON b.id = p.brand_id
         WHERE s.user_id = target_user_id 
           AND s.action IN ('right', 'up')
           AND s.created_at > NOW() - INTERVAL '30 days'
         GROUP BY b.name
         ORDER BY brand_count DESC
         LIMIT 5
       ) top_brands_data),
      '{}'::jsonb
    ) as top_brands,
    
    -- Recent activity (last 20 swipes)
    COALESCE(
      (SELECT jsonb_agg(
         jsonb_build_object(
           'product_id', s.product_id,
           'action', s.action,
           'created_at', s.created_at,
           'product_title', p.title,
           'category', p.category_slug
         ) ORDER BY s.created_at DESC
       )
       FROM (
         SELECT s.*, p.title, p.category_slug
         FROM swipes s
         JOIN products p ON p.id = s.product_id
         WHERE s.user_id = target_user_id
         ORDER BY s.created_at DESC
         LIMIT 20
       ) s),
      '[]'::jsonb
    ) as recent_activity,
    
    -- Get preference confidence from taste profile
    COALESCE(
      (SELECT preference_confidence 
       FROM user_taste_profiles 
       WHERE user_id = target_user_id),
      0.0
    ) as preference_confidence
    
  FROM swipes s
  WHERE s.user_id = target_user_id;
END;
$function$;

-- Function to batch track analytics events
CREATE OR REPLACE FUNCTION public.batch_track_analytics(
  target_user_id uuid,
  events_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  processed_count integer := 0;
  event_record jsonb;
  result jsonb;
BEGIN
  -- Only allow users to track their own analytics
  IF target_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: You can only track your own analytics';
  END IF;
  
  -- Process each event in the batch
  FOR event_record IN SELECT * FROM jsonb_array_elements(events_data)
  LOOP
    -- Insert into events table for general analytics
    INSERT INTO public.events (
      user_id,
      event_type,
      product_id,
      event_data,
      created_at
    ) VALUES (
      target_user_id,
      event_record->>'event_type',
      CASE 
        WHEN event_record->>'product_id' != '' 
        THEN (event_record->>'product_id')::uuid 
        ELSE NULL 
      END,
      event_record->'event_data',
      COALESCE(
        (event_record->>'created_at')::timestamp with time zone,
        NOW()
      )
    );
    
    processed_count := processed_count + 1;
  END LOOP;
  
  -- Return processing results
  result := jsonb_build_object(
    'processed_count', processed_count,
    'success', true,
    'timestamp', NOW()
  );
  
  RETURN result;
END;
$function$;

-- Function to cleanup old analytics data (for memory management)
CREATE OR REPLACE FUNCTION public.cleanup_old_analytics(days_to_keep integer DEFAULT 90)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deleted_events integer := 0;
  deleted_swipes integer := 0;
  cutoff_time timestamp with time zone;
BEGIN
  -- Only allow service role to run cleanup
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: Service role required for cleanup operations';
  END IF;
  
  cutoff_time := NOW() - (days_to_keep || ' days')::interval;
  
  -- Delete old events (keep basic analytics but remove detailed event data)
  DELETE FROM public.events 
  WHERE created_at < cutoff_time 
    AND event_type NOT IN ('purchase', 'signup', 'premium_upgrade');
  
  GET DIAGNOSTICS deleted_events = ROW_COUNT;
  
  -- Archive old swipes (move to a separate archival process if needed)
  -- For now, we keep swipes for taste profile learning
  
  RETURN jsonb_build_object(
    'deleted_events', deleted_events,
    'deleted_swipes', deleted_swipes,
    'cutoff_time', cutoff_time,
    'cleanup_completed_at', NOW()
  );
END;
$function$;