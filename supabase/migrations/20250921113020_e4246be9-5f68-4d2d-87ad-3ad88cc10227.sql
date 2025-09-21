-- Fix the products_public view to handle media_urls properly
DROP VIEW IF EXISTS public.products_public;

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