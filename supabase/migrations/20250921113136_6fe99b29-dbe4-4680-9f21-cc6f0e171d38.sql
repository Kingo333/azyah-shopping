-- Fix the products_public view and function to handle media_urls properly
-- First drop the function and view with cascade
DROP FUNCTION IF EXISTS public.get_public_products(INTEGER, INTEGER, TEXT) CASCADE;
DROP VIEW IF EXISTS public.products_public CASCADE;

-- Recreate the view with proper media_urls handling
CREATE VIEW public.products_public AS
SELECT 
  id,
  title,
  price_cents,
  currency,
  category_slug,
  subcategory_slug,
  image_url,
  -- Safely handle media_urls - only include first image for preview
  CASE 
    WHEN media_urls IS NOT NULL AND jsonb_typeof(media_urls) = 'array' AND jsonb_array_length(media_urls) > 0 
    THEN jsonb_build_array(media_urls->0)
    WHEN media_urls IS NOT NULL AND jsonb_typeof(media_urls) = 'string'
    THEN '[]'::jsonb
    ELSE '[]'::jsonb
  END as media_urls,
  external_url,
  -- Include safe brand information only
  (SELECT jsonb_build_object(
    'id', b.id,
    'name', b.name,
    'slug', b.slug,
    'logo_url', b.logo_url
  ) FROM brands b WHERE b.id = products.brand_id) as brand_info,
  created_at
FROM products 
WHERE status = 'active';

-- Set security invoker mode
ALTER VIEW public.products_public SET (security_invoker = on);

-- Recreate the function
CREATE FUNCTION public.get_public_products(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_category TEXT DEFAULT NULL
)
RETURNS SETOF products_public
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log access attempt for monitoring
  IF auth.uid() IS NULL THEN
    INSERT INTO events (event_type, event_data, ip_address, created_at)
    VALUES (
      'public_product_access',
      jsonb_build_object(
        'limit', p_limit,
        'offset', p_offset,
        'category', p_category,
        'access_type', 'anonymous'
      ),
      inet_client_addr(),
      now()
    );
  END IF;

  -- Return limited public product data
  RETURN QUERY
  SELECT * FROM products_public pp
  WHERE (p_category IS NULL OR pp.category_slug::text = p_category)
  ORDER BY pp.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;