-- Drop all get_public_products functions with their exact signatures
DROP FUNCTION IF EXISTS public.get_public_products(limit_param integer, offset_param integer, category_filter text, subcategory_filter text, brand_filter text, search_query text, gender_filter text, price_min integer, price_max integer) CASCADE;

DROP FUNCTION IF EXISTS public.get_public_products_secure(limit_param integer, offset_param integer, category_filter text) CASCADE;

DROP FUNCTION IF EXISTS public.get_public_products_secure(limit_param integer, offset_param integer, category_filter text, subcategory_filter text, brand_filter text, search_query text, gender_filter text, price_min integer, price_max integer) CASCADE;

-- Create a single clean function
CREATE OR REPLACE FUNCTION public.get_public_products_secure(
  limit_param integer DEFAULT 20,
  offset_param integer DEFAULT 0,
  category_filter text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  price_cents integer,
  currency text,
  image_url text,
  media_urls jsonb,
  external_url text,
  category_slug text,
  subcategory_slug text,
  gender text,
  tags text[],
  status text,
  is_external boolean,
  merchant_name text,
  brand_id uuid,
  retailer_id uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  brand jsonb,
  retailer jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.description,
    p.price_cents,
    p.currency,
    p.image_url,
    p.media_urls,
    p.external_url,
    p.category_slug::text,
    p.subcategory_slug::text,
    p.gender::text,
    p.tags,
    p.status,
    p.is_external,
    p.merchant_name,
    p.brand_id,
    p.retailer_id,
    p.created_at,
    p.updated_at,
    CASE 
      WHEN b.id IS NOT NULL THEN jsonb_build_object(
        'id', b.id,
        'name', b.name,
        'slug', b.slug,
        'logo_url', b.logo_url
      )
      ELSE NULL
    END as brand,
    CASE 
      WHEN r.id IS NOT NULL THEN jsonb_build_object(
        'id', r.id,
        'name', r.name,
        'slug', r.slug,
        'logo_url', r.logo_url
      )
      ELSE NULL
    END as retailer
  FROM products p
  LEFT JOIN brands b ON b.id = p.brand_id
  LEFT JOIN retailers r ON r.id = p.retailer_id
  WHERE p.status = 'active'
    AND (category_filter IS NULL OR p.category_slug::text = category_filter)
  ORDER BY p.created_at DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$$;