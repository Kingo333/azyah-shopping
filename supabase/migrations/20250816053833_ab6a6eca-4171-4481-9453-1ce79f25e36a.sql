-- Fix security warnings by setting search_path for all functions
-- Update get_trending_categories function with secure search_path
CREATE OR REPLACE FUNCTION public.get_trending_categories(
  days_back INTEGER DEFAULT 7,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  category_slug category_type,
  subcategory_slug subcategory_type,
  swipe_count BIGINT,
  like_count BIGINT,
  growth_percentage NUMERIC,
  recent_products JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH time_periods AS (
    SELECT 
      NOW() - INTERVAL '1 day' * days_back AS current_period_start,
      NOW() - INTERVAL '1 day' * (days_back * 2) AS previous_period_start,
      NOW() - INTERVAL '1 day' * days_back AS previous_period_end
  ),
  current_period_stats AS (
    SELECT 
      p.category_slug,
      p.subcategory_slug,
      COUNT(*) as swipe_count,
      COUNT(*) FILTER (WHERE s.action = 'right') as like_count
    FROM swipes s
    JOIN products p ON p.id = s.product_id
    CROSS JOIN time_periods tp
    WHERE s.created_at >= tp.current_period_start
      AND p.status = 'active'
    GROUP BY p.category_slug, p.subcategory_slug
  ),
  previous_period_stats AS (
    SELECT 
      p.category_slug,
      p.subcategory_slug,
      COUNT(*) as swipe_count
    FROM swipes s
    JOIN products p ON p.id = s.product_id
    CROSS JOIN time_periods tp
    WHERE s.created_at >= tp.previous_period_start 
      AND s.created_at < tp.previous_period_end
      AND p.status = 'active'
    GROUP BY p.category_slug, p.subcategory_slug
  ),
  recent_products_agg AS (
    SELECT 
      p.category_slug,
      p.subcategory_slug,
      jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'title', p.title,
          'image_url', p.image_url,
          'price_cents', p.price_cents,
          'currency', p.currency
        ) ORDER BY s.created_at DESC
      ) FILTER (WHERE rn <= 3) as recent_products
    FROM (
      SELECT p.*, s.created_at,
        ROW_NUMBER() OVER (PARTITION BY p.category_slug, p.subcategory_slug ORDER BY s.created_at DESC) as rn
      FROM swipes s
      JOIN products p ON p.id = s.product_id
      CROSS JOIN time_periods tp
      WHERE s.created_at >= tp.current_period_start
        AND p.status = 'active'
        AND s.action = 'right'
    ) p
    WHERE rn <= 3
    GROUP BY p.category_slug, p.subcategory_slug
  )
  SELECT 
    c.category_slug,
    c.subcategory_slug,
    c.swipe_count,
    c.like_count,
    CASE 
      WHEN COALESCE(p.swipe_count, 0) = 0 THEN 100.0
      ELSE ROUND(
        ((c.swipe_count - COALESCE(p.swipe_count, 0))::NUMERIC / COALESCE(p.swipe_count, 1)) * 100, 
        1
      )
    END as growth_percentage,
    COALESCE(rp.recent_products, '[]'::jsonb) as recent_products
  FROM current_period_stats c
  LEFT JOIN previous_period_stats p ON (
    p.category_slug = c.category_slug 
    AND p.subcategory_slug = c.subcategory_slug
  )
  LEFT JOIN recent_products_agg rp ON (
    rp.category_slug = c.category_slug 
    AND rp.subcategory_slug = c.subcategory_slug
  )
  ORDER BY c.swipe_count DESC, c.like_count DESC
  LIMIT limit_count;
END;
$$;

-- Update get_fallback_trending_categories function with secure search_path
CREATE OR REPLACE FUNCTION public.get_fallback_trending_categories(
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  category_slug category_type,
  subcategory_slug subcategory_type,
  product_count BIGINT,
  recent_products JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.category_slug,
    p.subcategory_slug,
    COUNT(*) as product_count,
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'title', p.title,
        'image_url', p.image_url,
        'price_cents', p.price_cents,
        'currency', p.currency
      ) ORDER BY p.created_at DESC
    ) FILTER (WHERE rn <= 3) as recent_products
  FROM (
    SELECT *,
      ROW_NUMBER() OVER (PARTITION BY category_slug, subcategory_slug ORDER BY created_at DESC) as rn
    FROM products
    WHERE status = 'active'
  ) p
  WHERE rn <= 3
  GROUP BY p.category_slug, p.subcategory_slug
  HAVING COUNT(*) >= 3
  ORDER BY product_count DESC
  LIMIT limit_count;
END;
$$;

-- Fix existing functions by setting search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.users (id, email, name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    -- Use the role from signup metadata, default to 'shopper' if not provided
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::user_role,
      'shopper'::user_role
    ),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_public_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.create_admin_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- This function will be used to create the initial admin user
  -- Should be called after authentication is set up
  NULL;
END;
$function$;