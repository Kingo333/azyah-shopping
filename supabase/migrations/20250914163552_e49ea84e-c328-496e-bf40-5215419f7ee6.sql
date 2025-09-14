-- Update the get_public_products_secure function to handle audit logging properly
-- Remove the problematic audit logging that causes read-only transaction errors
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
  category_slug category_type,
  subcategory_slug subcategory_type,
  gender gender_type,
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
  -- Return data from the secure products_public view
  RETURN QUERY
  SELECT 
    pp.id,
    pp.title,
    pp.description,
    pp.price_cents,
    pp.currency,
    pp.image_url,
    pp.media_urls,
    pp.external_url,
    pp.category_slug,
    pp.subcategory_slug,
    pp.gender,
    pp.tags,
    pp.status,
    pp.is_external,
    pp.merchant_name,
    pp.brand_id,
    pp.retailer_id,
    pp.created_at,
    pp.updated_at,
    pp.brand,
    pp.retailer
  FROM public.products_public pp
  WHERE 
    (category_filter IS NULL OR pp.category_slug::text = category_filter)
    AND pp.status = 'active'
  ORDER BY pp.created_at DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$$;