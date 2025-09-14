-- Fix get_public_products function to remove non-existent preview_media column
CREATE OR REPLACE FUNCTION public.get_public_products(
  limit_param integer DEFAULT 20,
  offset_param integer DEFAULT 0,
  category_filter text DEFAULT NULL,
  subcategory_filter text DEFAULT NULL,
  brand_filter text DEFAULT NULL,
  search_query text DEFAULT NULL,
  gender_filter text DEFAULT NULL,
  price_min integer DEFAULT NULL,
  price_max integer DEFAULT NULL
)
RETURNS TABLE (
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
  size_chart jsonb,
  attributes jsonb,
  tags text[],
  status text,
  is_external boolean,
  source text,
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
    p.size_chart,
    p.attributes,
    p.tags,
    p.status,
    p.is_external,
    p.source,
    p.merchant_name,
    p.brand_id,
    p.retailer_id,
    p.created_at,
    p.updated_at,
    CASE 
      WHEN b.id IS NOT NULL THEN 
        jsonb_build_object(
          'id', b.id,
          'name', b.name,
          'slug', b.slug,
          'logo_url', b.logo_url,
          'website', b.website
        )
      ELSE NULL
    END as brand,
    CASE 
      WHEN r.id IS NOT NULL THEN 
        jsonb_build_object(
          'id', r.id,
          'name', r.name,
          'slug', r.slug,
          'logo_url', r.logo_url,
          'website', r.website
        )
      ELSE NULL
    END as retailer
  FROM products p
  LEFT JOIN brands b ON b.id = p.brand_id
  LEFT JOIN retailers r ON r.id = p.retailer_id
  WHERE 
    p.status = 'active'
    AND (category_filter IS NULL OR p.category_slug::text = category_filter)
    AND (subcategory_filter IS NULL OR p.subcategory_slug::text = subcategory_filter)
    AND (brand_filter IS NULL OR b.slug = brand_filter)
    AND (search_query IS NULL OR (
      p.title ILIKE '%' || search_query || '%' 
      OR p.description ILIKE '%' || search_query || '%'
      OR b.name ILIKE '%' || search_query || '%'
      OR r.name ILIKE '%' || search_query || '%'
    ))
    AND (gender_filter IS NULL OR p.gender::text = gender_filter)
    AND (price_min IS NULL OR p.price_cents >= price_min)
    AND (price_max IS NULL OR p.price_cents <= price_max)
  ORDER BY p.created_at DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$$;