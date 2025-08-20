-- Fix remaining security linter issues

-- 1. Fix function search_path for all security definer functions that don't have it set
CREATE OR REPLACE FUNCTION public.admin_get_user_data(user_id_param uuid)
RETURNS SETOF users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow if current user is admin
  IF public.get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  RETURN QUERY SELECT * FROM public.users WHERE id = user_id_param;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_subscription_status()
RETURNS TABLE(subscription_id uuid, plan text, status text, is_active boolean, expires_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the access attempt
  PERFORM public.log_user_data_access('GET_SUBSCRIPTION_STATUS', 'subscriptions', auth.uid());
  
  RETURN QUERY
  SELECT 
    s.id as subscription_id,
    s.plan,
    s.status,
    (s.status = 'active' AND s.current_period_end > NOW()) as is_active,
    s.current_period_end as expires_at
  FROM public.subscriptions s
  WHERE s.user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.log_user_data_access(action_type text, table_name text, accessed_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    table_name,
    accessed_user_id,
    ip_address
  ) VALUES (
    auth.uid(),
    action_type,
    table_name,
    accessed_user_id,
    inet_client_addr()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_subscription_details(target_user_id uuid)
RETURNS TABLE(subscription_id uuid, user_email text, plan text, status text, current_period_start timestamp with time zone, current_period_end timestamp with time zone, last_payment_status text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow if current user is admin
  IF public.get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  -- Log admin access to subscription data
  PERFORM public.log_user_data_access('ADMIN_VIEW_SUBSCRIPTION', 'subscriptions', target_user_id);
  
  RETURN QUERY
  SELECT 
    s.id as subscription_id,
    u.email as user_email,
    s.plan,
    s.status,
    s.current_period_start,
    s.current_period_end,
    s.last_payment_status,
    s.created_at
  FROM public.subscriptions s
  JOIN public.users u ON u.id = s.user_id
  WHERE s.user_id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_profile(profile_user_id uuid)
RETURNS TABLE(user_id uuid, display_name text, avatar_url text, bio text, country text, website text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log access attempt for audit purposes
  PERFORM public.log_user_data_access('VIEW_PUBLIC_PROFILE', 'public_profiles', profile_user_id);
  
  RETURN QUERY
  SELECT 
    pp.id as user_id,
    pp.name as display_name,
    pp.avatar_url,
    pp.bio,
    pp.country,
    pp.website,
    pp.created_at
  FROM public.public_profiles pp
  WHERE pp.id = profile_user_id 
  AND (pp.is_public = true OR pp.id = auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS TABLE(user_id uuid, user_name text, user_avatar_url text, user_bio text, user_country text, user_website text, user_role user_role, user_created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Log access attempt
  PERFORM public.log_user_data_access('VIEW_OWN_PROFILE', 'users', auth.uid());
  
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.name as user_name,
    u.avatar_url as user_avatar_url,
    u.bio as user_bio,
    u.country as user_country,
    u.website as user_website,
    u.role as user_role,
    u.created_at as user_created_at
  FROM public.users u
  WHERE u.id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_public_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.public_profiles (id, name, avatar_url, bio, country, website, created_at)
        VALUES (NEW.id, NEW.name, NEW.avatar_url, NEW.bio, NEW.country, NEW.website, NEW.created_at);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE public.public_profiles 
        SET 
            name = NEW.name,
            avatar_url = NEW.avatar_url,
            bio = NEW.bio,
            country = NEW.country,
            website = NEW.website
        WHERE id = NEW.id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM public.public_profiles WHERE id = OLD.id;
        RETURN OLD;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Determine provider from raw_app_meta_data, not app_metadata
  DECLARE
    user_provider TEXT := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');
    user_provider_id TEXT := CASE 
      WHEN user_provider = 'google' THEN NEW.raw_user_meta_data->>'provider_id'
      ELSE NULL 
    END;
  BEGIN
    INSERT INTO public.users (
      id, 
      email, 
      name, 
      role, 
      provider,
      provider_id,
      avatar_url,
      created_at, 
      updated_at
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(
        NEW.raw_user_meta_data->>'name', 
        NEW.raw_user_meta_data->>'full_name',
        split_part(NEW.email, '@', 1)
      ),
      -- Use the role from signup metadata, default to 'shopper' if not provided
      COALESCE(
        (NEW.raw_user_meta_data->>'role')::user_role,
        'shopper'::user_role
      ),
      user_provider,
      user_provider_id,
      NEW.raw_user_meta_data->>'avatar_url',
      NOW(),
      NOW()
    );
    RETURN NEW;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_user_role_with_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Update user data when metadata changes (like from OAuth callback)
  IF NEW.raw_user_meta_data IS DISTINCT FROM OLD.raw_user_meta_data THEN
    UPDATE public.users 
    SET 
      role = COALESCE((NEW.raw_user_meta_data->>'role')::user_role, role),
      name = COALESCE(
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'full_name', 
        name
      ),
      avatar_url = COALESCE(NEW.raw_user_meta_data->>'avatar_url', avatar_url),
      updated_at = NOW(),
      last_sign_in_at = NOW()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_taste_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_exists BOOLEAN;
  current_profile RECORD;
  product_data RECORD;
  weight_multiplier NUMERIC := 1.0;
  category_weight NUMERIC;
  brand_weight NUMERIC;
  price_weight NUMERIC;
BEGIN
  -- Get product data for this swipe
  SELECT 
    p.category_slug,
    p.subcategory_slug,
    p.price_cents,
    p.currency,
    p.tags,
    b.name as brand_name,
    p.attributes
  INTO product_data
  FROM products p
  LEFT JOIN brands b ON b.id = p.brand_id
  WHERE p.id = NEW.product_id;
  
  -- Calculate learning weights based on action type
  weight_multiplier := CASE NEW.action
    WHEN 'right' THEN 2.0  -- Strong positive signal
    WHEN 'up' THEN 3.0     -- Very strong positive signal (wishlist)
    WHEN 'left' THEN -1.0  -- Negative signal
    ELSE 0.5               -- Neutral/other actions
  END;
  
  -- Check if profile exists
  SELECT EXISTS(
    SELECT 1 FROM public.user_taste_profiles WHERE user_id = NEW.user_id
  ) INTO profile_exists;
  
  -- Create profile if it doesn't exist
  IF NOT profile_exists THEN
    INSERT INTO public.user_taste_profiles (
      user_id,
      category_preferences,
      brand_preferences,
      price_preferences,
      total_swipes,
      positive_swipes,
      negative_swipes
    ) VALUES (
      NEW.user_id,
      '{}',
      '{}', 
      '{}',
      0,
      0,
      0
    );
  END IF;
  
  -- Get current profile
  SELECT * INTO current_profile 
  FROM public.user_taste_profiles 
  WHERE user_id = NEW.user_id;
  
  -- Calculate preference weights
  category_weight := COALESCE(
    (current_profile.category_preferences->product_data.category_slug::text)::numeric, 
    0
  ) + (weight_multiplier * NEW.learning_weight);
  
  brand_weight := COALESCE(
    (current_profile.brand_preferences->product_data.brand_name)::numeric,
    0
  ) + (weight_multiplier * NEW.learning_weight);
  
  price_weight := COALESCE(
    (current_profile.price_preferences->(
      CASE 
        WHEN product_data.price_cents < 5000 THEN 'budget'
        WHEN product_data.price_cents < 20000 THEN 'mid_range'
        ELSE 'premium'
      END
    ))::numeric,
    0
  ) + (weight_multiplier * NEW.learning_weight);
  
  -- Update the profile with new preferences
  UPDATE public.user_taste_profiles
  SET 
    category_preferences = jsonb_set(
      category_preferences,
      ARRAY[product_data.category_slug::text],
      to_jsonb(category_weight)
    ),
    brand_preferences = CASE 
      WHEN product_data.brand_name IS NOT NULL THEN
        jsonb_set(
          brand_preferences,
          ARRAY[product_data.brand_name],
          to_jsonb(brand_weight)
        )
      ELSE brand_preferences
    END,
    price_preferences = jsonb_set(
      price_preferences,
      ARRAY[CASE 
        WHEN product_data.price_cents < 5000 THEN 'budget'
        WHEN product_data.price_cents < 20000 THEN 'mid_range'
        ELSE 'premium'
      END],
      to_jsonb(price_weight)
    ),
    total_swipes = total_swipes + 1,
    positive_swipes = positive_swipes + CASE WHEN NEW.action IN ('right', 'up') THEN 1 ELSE 0 END,
    negative_swipes = negative_swipes + CASE WHEN NEW.action = 'left' THEN 1 ELSE 0 END,
    preference_confidence = LEAST(1.0, (total_swipes + 1) / 100.0),
    last_updated_at = now()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$;