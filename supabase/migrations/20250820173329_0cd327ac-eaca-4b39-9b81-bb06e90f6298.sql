-- Fix security definer view issue by dropping the problematic view
-- The subscription_status view is using SECURITY DEFINER which enforces permissions of the view creator
-- Instead, users should query the subscriptions table directly with proper RLS policies

DROP VIEW IF EXISTS public.subscription_status;

-- Ensure the subscriptions table has proper RLS policies (they already exist but let's verify they're secure)
-- The existing policies only allow users to see their own subscriptions which is correct

-- Fix any remaining function search path issues
CREATE OR REPLACE FUNCTION public.get_trending_categories(days_back integer DEFAULT 7, limit_count integer DEFAULT 20)
RETURNS TABLE(category_slug category_type, subcategory_slug subcategory_type, swipe_count bigint, like_count bigint, growth_percentage numeric, recent_products jsonb)
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

CREATE OR REPLACE FUNCTION public.get_fallback_trending_categories(limit_count integer DEFAULT 20)
RETURNS TABLE(category_slug category_type, subcategory_slug subcategory_type, product_count bigint, recent_products jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    products_with_rank.category_slug,
    products_with_rank.subcategory_slug,
    COUNT(*) as product_count,
    jsonb_agg(
      jsonb_build_object(
        'id', products_with_rank.id,
        'title', products_with_rank.title,
        'image_url', COALESCE(products_with_rank.image_url, 
                             CASE 
                               WHEN jsonb_array_length(products_with_rank.media_urls) > 0 
                               THEN products_with_rank.media_urls->0->>0
                               ELSE '/placeholder.svg'
                             END),
        'price_cents', products_with_rank.price_cents,
        'currency', products_with_rank.currency
      ) ORDER BY products_with_rank.created_at DESC
    ) FILTER (WHERE products_with_rank.rn <= 3) as recent_products
  FROM (
    SELECT 
      p.id,
      p.title,
      p.image_url,
      p.media_urls,
      p.price_cents,
      p.currency,
      p.category_slug,
      p.subcategory_slug,
      p.created_at,
      ROW_NUMBER() OVER (PARTITION BY p.category_slug, p.subcategory_slug ORDER BY p.created_at DESC) as rn
    FROM products p
    WHERE p.status = 'active'
  ) products_with_rank
  WHERE products_with_rank.rn <= 3
  GROUP BY products_with_rank.category_slug, products_with_rank.subcategory_slug
  HAVING COUNT(*) >= 3
  ORDER BY product_count DESC
  LIMIT limit_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_personalized_product_scores(target_user_id uuid, product_ids uuid[])
RETURNS TABLE(product_id uuid, personalization_score numeric, category_score numeric, brand_score numeric, price_score numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_profile RECORD;
BEGIN
  -- Get user's taste profile
  SELECT * INTO user_profile
  FROM public.user_taste_profiles
  WHERE user_id = target_user_id;
  
  -- If no profile exists, return neutral scores
  IF user_profile IS NULL THEN
    RETURN QUERY
    SELECT 
      p.id as product_id,
      0.5::numeric as personalization_score,
      0.5::numeric as category_score,
      0.5::numeric as brand_score,
      0.5::numeric as price_score
    FROM products p
    WHERE p.id = ANY(product_ids);
    RETURN;
  END IF;
  
  -- Calculate personalized scores for each product
  RETURN QUERY
  SELECT 
    p.id as product_id,
    GREATEST(0.0, LEAST(1.0, 
      -- Weighted combination of all preference scores
      (COALESCE((user_profile.category_preferences->p.category_slug::text)::numeric, 0) * 0.4 +
       COALESCE((user_profile.brand_preferences->b.name)::numeric, 0) * 0.3 +
       COALESCE((user_profile.price_preferences->(
         CASE 
           WHEN p.price_cents < 5000 THEN 'budget'
           WHEN p.price_cents < 20000 THEN 'mid_range'
           ELSE 'premium'
         END
       ))::numeric, 0) * 0.2 +
       0.1) -- Base score for exploration
    )) as personalization_score,
    COALESCE((user_profile.category_preferences->p.category_slug::text)::numeric, 0) as category_score,
    COALESCE((user_profile.brand_preferences->b.name)::numeric, 0) as brand_score,
    COALESCE((user_profile.price_preferences->(
      CASE 
        WHEN p.price_cents < 5000 THEN 'budget'
        WHEN p.price_cents < 20000 THEN 'mid_range'
        ELSE 'premium'
      END
    ))::numeric, 0) as price_score
  FROM products p
  LEFT JOIN brands b ON b.id = p.brand_id
  WHERE p.id = ANY(product_ids)
    AND p.status = 'active';
END;
$$;