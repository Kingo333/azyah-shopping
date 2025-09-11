-- Create a comprehensive user deletion function
CREATE OR REPLACE FUNCTION public.delete_user_completely(target_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  target_user_id uuid;
  deletion_summary json;
  tables_cleaned text[] := ARRAY[]::text[];
  total_records_deleted integer := 0;
  temp_count integer;
BEGIN
  -- Find user by email
  SELECT id INTO target_user_id 
  FROM auth.users 
  WHERE email = target_email;
  
  IF target_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User not found with email: ' || target_email
    );
  END IF;
  
  -- Start deletion process - order matters due to foreign keys
  
  -- Delete from tables with foreign key references first
  
  -- Delete user sessions
  DELETE FROM public.user_sessions WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  IF temp_count > 0 THEN
    tables_cleaned := array_append(tables_cleaned, 'user_sessions (' || temp_count || ')');
    total_records_deleted := total_records_deleted + temp_count;
  END IF;
  
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
  
  -- Delete main user record
  DELETE FROM public.users WHERE id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  IF temp_count > 0 THEN
    tables_cleaned := array_append(tables_cleaned, 'users (' || temp_count || ')');
    total_records_deleted := total_records_deleted + temp_count;
  END IF;
  
  -- Build summary
  deletion_summary := json_build_object(
    'success', true,
    'message', 'User ' || target_email || ' has been completely deleted',
    'user_id', target_user_id,
    'total_records_deleted', total_records_deleted,
    'tables_cleaned', tables_cleaned,
    'deleted_at', now()
  );
  
  RETURN deletion_summary;
  
EXCEPTION WHEN others THEN
  RETURN json_build_object(
    'success', false,
    'message', 'Error during deletion: ' || SQLERRM,
    'error_code', SQLSTATE
  );
END;
$$;