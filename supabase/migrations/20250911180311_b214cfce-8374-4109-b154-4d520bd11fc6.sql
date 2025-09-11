-- Update delete_user_completely function to handle orphaned users and force deletion
CREATE OR REPLACE FUNCTION public.delete_user_completely(target_email text, force_orphaned_deletion boolean DEFAULT false)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  target_user_id uuid;
  target_user_record RECORD;
  deletion_summary json;
  tables_cleaned text[] := ARRAY[]::text[];
  total_records_deleted integer := 0;
  temp_count integer;
  is_orphaned boolean := false;
BEGIN
  -- First, try to find user in public.users table (case insensitive)
  SELECT * INTO target_user_record 
  FROM public.users 
  WHERE LOWER(email) = LOWER(target_email);
  
  -- If found in public.users, use that ID
  IF target_user_record IS NOT NULL THEN
    target_user_id := target_user_record.id;
    RAISE LOG 'Found user in public.users with ID: %', target_user_id;
  ELSE
    -- If not in public.users, try to find in auth.users
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE LOWER(email) = LOWER(target_email);
    
    IF target_user_id IS NOT NULL THEN
      RAISE LOG 'Found user in auth.users with ID: %', target_user_id;
    END IF;
  END IF;
  
  -- If user not found in either place, return appropriate message
  IF target_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User not found with email: ' || target_email || ' in either public.users or auth.users',
      'force_orphaned_deletion', force_orphaned_deletion
    );
  END IF;
  
  -- Check if this is an orphaned user (exists in public but not in auth)
  IF target_user_record IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
      is_orphaned := true;
      RAISE LOG 'Detected orphaned user: % (exists in public but not in auth)', target_user_id;
    END IF;
  END IF;
  
  RAISE LOG 'Starting deletion process for user_id: % with email: %, orphaned: %, force: %', 
    target_user_id, target_email, is_orphaned, force_orphaned_deletion;
  
  -- Start deletion process - order matters due to foreign keys
  
  -- Delete beauty related data
  DELETE FROM public.beauty_consult_events WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  IF temp_count > 0 THEN
    tables_cleaned := array_append(tables_cleaned, 'beauty_consult_events (' || temp_count || ')');
    total_records_deleted := total_records_deleted + temp_count;
  END IF;
  
  DELETE FROM public.beauty_consults WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  IF temp_count > 0 THEN
    tables_cleaned := array_append(tables_cleaned, 'beauty_consults (' || temp_count || ')');
    total_records_deleted := total_records_deleted + temp_count;
  END IF;
  
  DELETE FROM public.beauty_profiles WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  IF temp_count > 0 THEN
    tables_cleaned := array_append(tables_cleaned, 'beauty_profiles (' || temp_count || ')');
    total_records_deleted := total_records_deleted + temp_count;
  END IF;
  
  -- Delete AI assets and jobs
  DELETE FROM public.ai_assets WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  IF temp_count > 0 THEN
    tables_cleaned := array_append(tables_cleaned, 'ai_assets (' || temp_count || ')');
    total_records_deleted := total_records_deleted + temp_count;
  END IF;
  
  DELETE FROM public.ai_tryon_jobs WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  IF temp_count > 0 THEN
    tables_cleaned := array_append(tables_cleaned, 'ai_tryon_jobs (' || temp_count || ')');
    total_records_deleted := total_records_deleted + temp_count;
  END IF;
  
  -- Delete affiliate links
  DELETE FROM public.affiliate_links WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  IF temp_count > 0 THEN
    tables_cleaned := array_append(tables_cleaned, 'affiliate_links (' || temp_count || ')');
    total_records_deleted := total_records_deleted + temp_count;
  END IF;
  
  -- Delete cart items
  DELETE FROM public.cart_items WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  IF temp_count > 0 THEN
    tables_cleaned := array_append(tables_cleaned, 'cart_items (' || temp_count || ')');
    total_records_deleted := total_records_deleted + temp_count;
  END IF;
  
  -- Delete likes and swipes
  DELETE FROM public.likes WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  IF temp_count > 0 THEN
    tables_cleaned := array_append(tables_cleaned, 'likes (' || temp_count || ')');
    total_records_deleted := total_records_deleted + temp_count;
  END IF;
  
  DELETE FROM public.swipes WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  IF temp_count > 0 THEN
    tables_cleaned := array_append(tables_cleaned, 'swipes (' || temp_count || ')');
    total_records_deleted := total_records_deleted + temp_count;
  END IF;
  
  -- Delete follows
  DELETE FROM public.follows WHERE follower_id = target_user_id OR following_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  IF temp_count > 0 THEN
    tables_cleaned := array_append(tables_cleaned, 'follows (' || temp_count || ')');
    total_records_deleted := total_records_deleted + temp_count;
  END IF;
  
  -- Delete posts and related data
  DELETE FROM public.post_likes WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  IF temp_count > 0 THEN
    tables_cleaned := array_append(tables_cleaned, 'post_likes (' || temp_count || ')');
    total_records_deleted := total_records_deleted + temp_count;
  END IF;
  
  -- Delete post images and products for user's posts
  DELETE FROM public.post_images WHERE post_id IN (SELECT id FROM public.posts WHERE user_id = target_user_id);
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  IF temp_count > 0 THEN
    tables_cleaned := array_append(tables_cleaned, 'post_images (' || temp_count || ')');
    total_records_deleted := total_records_deleted + temp_count;
  END IF;
  
  DELETE FROM public.post_products WHERE post_id IN (SELECT id FROM public.posts WHERE user_id = target_user_id);
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  IF temp_count > 0 THEN
    tables_cleaned := array_append(tables_cleaned, 'post_products (' || temp_count || ')');
    total_records_deleted := total_records_deleted + temp_count;
  END IF;
  
  DELETE FROM public.posts WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  IF temp_count > 0 THEN
    tables_cleaned := array_append(tables_cleaned, 'posts (' || temp_count || ')');
    total_records_deleted := total_records_deleted + temp_count;
  END IF;
  
  -- Delete look related data
  DELETE FROM public.look_votes WHERE voter_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  IF temp_count > 0 THEN
    tables_cleaned := array_append(tables_cleaned, 'look_votes (' || temp_count || ')');
    total_records_deleted := total_records_deleted + temp_count;
  END IF;
  
  DELETE FROM public.look_items WHERE look_id IN (SELECT id FROM public.looks WHERE user_id = target_user_id);
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  IF temp_count > 0 THEN
    tables_cleaned := array_append(tables_cleaned, 'look_items (' || temp_count || ')');
    total_records_deleted := total_records_deleted + temp_count;
  END IF;
  
  DELETE FROM public.looks WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  IF temp_count > 0 THEN
    tables_cleaned := array_append(tables_cleaned, 'looks (' || temp_count || ')');
    total_records_deleted := total_records_deleted + temp_count;
  END IF;
  
  DELETE FROM public.look_templates WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  IF temp_count > 0 THEN
    tables_cleaned := array_append(tables_cleaned, 'look_templates (' || temp_count || ')');
    total_records_deleted := total_records_deleted + temp_count;
  END IF;
  
  -- Delete closet related data
  DELETE FROM public.closet_ratings WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  IF temp_count > 0 THEN
    tables_cleaned := array_append(tables_cleaned, 'closet_ratings (' || temp_count || ')');
    total_records_deleted := total_records_deleted + temp_count;
  END IF;
  
  DELETE FROM public.closet_items WHERE closet_id IN (SELECT id FROM public.closets WHERE user_id = target_user_id);
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  IF temp_count > 0 THEN
    tables_cleaned := array_append(tables_cleaned, 'closet_items (' || temp_count || ')');
    total_records_deleted := total_records_deleted + temp_count;
  END IF;
  
  DELETE FROM public.closets WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  IF temp_count > 0 THEN
    tables_cleaned := array_append(tables_cleaned, 'closets (' || temp_count || ')');
    total_records_deleted := total_records_deleted + temp_count;
  END IF;
  
  -- Delete collaboration related data
  DELETE FROM public.collab_applications WHERE shopper_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  IF temp_count > 0 THEN
    tables_cleaned := array_append(tables_cleaned, 'collab_applications (' || temp_count || ')');
    total_records_deleted := total_records_deleted + temp_count;
  END IF;
  
  DELETE FROM public.collaborations WHERE created_by = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  IF temp_count > 0 THEN
    tables_cleaned := array_append(tables_cleaned, 'collaborations (' || temp_count || ')');
    total_records_deleted := total_records_deleted + temp_count;
  END IF;
  
  -- Delete import related data
  DELETE FROM public.import_job_status WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  IF temp_count > 0 THEN
    tables_cleaned := array_append(tables_cleaned, 'import_job_status (' || temp_count || ')');
    total_records_deleted := total_records_deleted + temp_count;
  END IF;
  
  DELETE FROM public.import_sources WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  IF temp_count > 0 THEN
    tables_cleaned := array_append(tables_cleaned, 'import_sources (' || temp_count || ')');
    total_records_deleted := total_records_deleted + temp_count;
  END IF;
  
  -- Delete payment and subscription data
  DELETE FROM public.payments WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  IF temp_count > 0 THEN
    tables_cleaned := array_append(tables_cleaned, 'payments (' || temp_count || ')');
    total_records_deleted := total_records_deleted + temp_count;
  END IF;
  
  DELETE FROM public.subscriptions WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  IF temp_count > 0 THEN
    tables_cleaned := array_append(tables_cleaned, 'subscriptions (' || temp_count || ')');
    total_records_deleted := total_records_deleted + temp_count;
  END IF;
  
  -- Delete user taste profile and credits
  DELETE FROM public.user_taste_profiles WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  IF temp_count > 0 THEN
    tables_cleaned := array_append(tables_cleaned, 'user_taste_profiles (' || temp_count || ')');
    total_records_deleted := total_records_deleted + temp_count;
  END IF;
  
  DELETE FROM public.user_credits WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  IF temp_count > 0 THEN
    tables_cleaned := array_append(tables_cleaned, 'user_credits (' || temp_count || ')');
    total_records_deleted := total_records_deleted + temp_count;
  END IF;
  
  -- Delete events
  DELETE FROM public.events WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  IF temp_count > 0 THEN
    tables_cleaned := array_append(tables_cleaned, 'events (' || temp_count || ')');
    total_records_deleted := total_records_deleted + temp_count;
  END IF;
  
  -- Delete brand and retailer owned data (if user owns any)
  DELETE FROM public.product_outfit_assets WHERE created_by = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  IF temp_count > 0 THEN
    tables_cleaned := array_append(tables_cleaned, 'product_outfit_assets (' || temp_count || ')');
    total_records_deleted := total_records_deleted + temp_count;
  END IF;
  
  -- Delete products owned by this user's brands/retailers
  DELETE FROM public.products WHERE brand_id IN (SELECT id FROM public.brands WHERE owner_user_id = target_user_id)
    OR retailer_id IN (SELECT id FROM public.retailers WHERE owner_user_id = target_user_id);
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  IF temp_count > 0 THEN
    tables_cleaned := array_append(tables_cleaned, 'products (' || temp_count || ')');
    total_records_deleted := total_records_deleted + temp_count;
  END IF;
  
  -- Delete brands and retailers owned by user
  DELETE FROM public.brands WHERE owner_user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  IF temp_count > 0 THEN
    tables_cleaned := array_append(tables_cleaned, 'brands (' || temp_count || ')');
    total_records_deleted := total_records_deleted + temp_count;
  END IF;
  
  DELETE FROM public.retailers WHERE owner_user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  IF temp_count > 0 THEN
    tables_cleaned := array_append(tables_cleaned, 'retailers (' || temp_count || ')');
    total_records_deleted := total_records_deleted + temp_count;
  END IF;
  
  -- Delete public profiles
  DELETE FROM public.public_profiles WHERE id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  IF temp_count > 0 THEN
    tables_cleaned := array_append(tables_cleaned, 'public_profiles (' || temp_count || ')');
    total_records_deleted := total_records_deleted + temp_count;
  END IF;
  
  -- Delete main user record (if exists in public schema)
  DELETE FROM public.users WHERE id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  IF temp_count > 0 THEN
    tables_cleaned := array_append(tables_cleaned, 'users (' || temp_count || ')');
    total_records_deleted := total_records_deleted + temp_count;
  END IF;
  
  -- Build summary
  deletion_summary := json_build_object(
    'success', true,
    'message', 'User ' || target_email || ' has been completely deleted from all public tables',
    'user_id', target_user_id,
    'user_found_in', CASE 
      WHEN target_user_record IS NOT NULL THEN 'public.users'
      ELSE 'auth.users'
    END,
    'is_orphaned', is_orphaned,
    'force_orphaned_deletion', force_orphaned_deletion,
    'total_records_deleted', total_records_deleted,
    'tables_cleaned', tables_cleaned,
    'deleted_at', now()
  );
  
  RETURN deletion_summary;
  
EXCEPTION WHEN others THEN
  RETURN json_build_object(
    'success', false,
    'message', 'Error during deletion: ' || SQLERRM,
    'error_code', SQLSTATE,
    'user_id', target_user_id,
    'is_orphaned', is_orphaned,
    'force_orphaned_deletion', force_orphaned_deletion
  );
END;
$function$;

-- Create a function to detect orphaned users
CREATE OR REPLACE FUNCTION public.detect_orphaned_users()
 RETURNS TABLE(user_id uuid, email text, role user_role, created_at timestamp with time zone, brand_count bigint, product_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email,
    u.role,
    u.created_at,
    COALESCE(brand_counts.brand_count, 0) as brand_count,
    COALESCE(product_counts.product_count, 0) as product_count
  FROM public.users u
  LEFT JOIN (
    SELECT owner_user_id, COUNT(*) as brand_count
    FROM public.brands
    GROUP BY owner_user_id
  ) brand_counts ON brand_counts.owner_user_id = u.id
  LEFT JOIN (
    SELECT b.owner_user_id, COUNT(p.*) as product_count
    FROM public.brands b
    LEFT JOIN public.products p ON p.brand_id = b.id
    GROUP BY b.owner_user_id
  ) product_counts ON product_counts.owner_user_id = u.id
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.users au WHERE au.id = u.id
  )
  ORDER BY u.created_at DESC;
END;
$function$;