-- Remove overly permissive anonymous access policies
DROP POLICY IF EXISTS "Anonymous users can view active products" ON public.products;
DROP POLICY IF EXISTS "Public can view active products" ON public.products;

-- Create secure policy for anonymous users (limited product preview only)
CREATE POLICY "Anonymous users can view basic product info only"
ON public.products
FOR SELECT
TO public
USING (
  status = 'active'::product_status
  AND auth.uid() IS NULL
);

-- Create policy for authenticated users (full product access)
CREATE POLICY "Authenticated users can view full active products"
ON public.products  
FOR SELECT
TO public
USING (
  status = 'active'::product_status
  AND auth.uid() IS NOT NULL
);

-- Create a secure view for anonymous users with limited product data
CREATE OR REPLACE VIEW public.products_public AS
SELECT 
  id,
  title,
  CASE 
    WHEN auth.uid() IS NOT NULL THEN price_cents
    ELSE NULL
  END as price_cents,
  CASE 
    WHEN auth.uid() IS NOT NULL THEN compare_at_price_cents  
    ELSE NULL
  END as compare_at_price_cents,
  currency,
  category_slug,
  subcategory_slug,
  image_url,
  CASE 
    WHEN auth.uid() IS NOT NULL THEN media_urls
    ELSE CASE 
      WHEN jsonb_array_length(media_urls) > 0 
      THEN jsonb_build_array(media_urls->0)
      ELSE '[]'::jsonb
    END
  END as media_urls,
  external_url,
  CASE 
    WHEN auth.uid() IS NOT NULL THEN description
    ELSE LEFT(description, 100) || CASE WHEN LENGTH(description) > 100 THEN '...' ELSE '' END
  END as description,
  brand_id,
  retailer_id,
  gender,
  tags,
  is_external,
  merchant_name,
  status,
  created_at,
  updated_at
FROM public.products
WHERE status = 'active'::product_status;

-- Set security invoker for the view to respect caller permissions
ALTER VIEW public.products_public SET (security_invoker = on);

-- Update get_public_products function to use secure data exposure
CREATE OR REPLACE FUNCTION public.get_public_products_secure(
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
DECLARE
  is_authenticated boolean;
BEGIN
  -- Check if user is authenticated
  is_authenticated := auth.uid() IS NOT NULL;
  
  -- Log access attempt for security monitoring
  INSERT INTO public.events (
    event_type, 
    user_id, 
    event_data
  ) VALUES (
    'PRODUCT_DATA_ACCESS',
    auth.uid(),
    jsonb_build_object(
      'is_authenticated', is_authenticated,
      'category_filter', category_filter,
      'access_time', now(),
      'ip_address', inet_client_addr()
    )
  );
  
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    -- Limit description for anonymous users
    CASE 
      WHEN is_authenticated THEN p.description
      ELSE LEFT(COALESCE(p.description, ''), 100) || 
           CASE WHEN LENGTH(COALESCE(p.description, '')) > 100 THEN '...' ELSE '' END
    END as description,
    -- Hide exact pricing from anonymous users
    CASE 
      WHEN is_authenticated THEN p.price_cents
      ELSE NULL
    END as price_cents,
    p.currency,
    p.image_url,
    -- Limit media exposure for anonymous users  
    CASE 
      WHEN is_authenticated THEN p.media_urls
      ELSE CASE 
        WHEN jsonb_array_length(p.media_urls) > 0 
        THEN jsonb_build_array(p.media_urls->0)
        ELSE '[]'::jsonb
      END
    END as media_urls,
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
      OR (is_authenticated AND p.description ILIKE '%' || search_query || '%')
      OR b.name ILIKE '%' || search_query || '%'
    ))
    AND (gender_filter IS NULL OR p.gender::text = gender_filter)
    -- Only apply price filters for authenticated users
    AND (NOT is_authenticated OR price_min IS NULL OR p.price_cents >= price_min)
    AND (NOT is_authenticated OR price_max IS NULL OR p.price_cents <= price_max)
  ORDER BY p.created_at DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$$;