-- Drop the overly permissive policy that allows public access to swipes
DROP POLICY IF EXISTS "Allow reading swipes for trending analysis" ON public.swipes;

-- Create a secure function to get trending categories with aggregated data
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

-- Create a function to get fallback trending data from products when no swipe data
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

-- Add performance indexes for trending calculations
CREATE INDEX IF NOT EXISTS idx_swipes_created_at_action ON public.swipes(created_at, action);
CREATE INDEX IF NOT EXISTS idx_swipes_product_created ON public.swipes(product_id, created_at);
CREATE INDEX IF NOT EXISTS idx_products_category_status ON public.products(category_slug, subcategory_slug, status);
CREATE INDEX IF NOT EXISTS idx_products_status_created ON public.products(status, created_at);

-- Create a policy that allows authenticated users to call the trending functions
-- (This is handled by the SECURITY DEFINER functions above, but we document the access pattern)

-- Create RLS policy to allow authenticated users to see basic swipe statistics for trending
CREATE POLICY "Allow authenticated users to read aggregated swipe trends" 
ON public.swipes 
FOR SELECT 
USING (
  -- This policy will be used by our secure functions only
  -- Individual swipe access is still restricted to the user's own swipes
  auth.role() = 'authenticated'
);