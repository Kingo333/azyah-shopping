-- Security Fix: Protect product business intelligence from competitors
-- Create secure public views and restrict product table access

-- Drop existing functions and views first
DROP FUNCTION IF EXISTS public.get_public_products(INTEGER, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.get_public_categories();
DROP VIEW IF EXISTS public.products_public;
DROP VIEW IF EXISTS public.categories_public;

-- Drop existing overly permissive anonymous access policies
DROP POLICY IF EXISTS "Anonymous users can view basic product info only" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can view active products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can view full active products" ON public.products;

-- Block anonymous access to the full products table completely
CREATE POLICY "products_block_anonymous_access" 
ON public.products 
FOR SELECT 
TO anon
USING (false);

-- Only authenticated users can access full product data
CREATE POLICY "products_authenticated_access_only" 
ON public.products 
FOR SELECT 
TO authenticated
USING (status = 'active');

-- Create secure public view with limited customer-facing data only
CREATE VIEW public.products_public AS
SELECT 
  id,
  title,
  price_cents,
  currency,
  category_slug,
  subcategory_slug,
  image_url,
  -- Only include first media URL for preview
  CASE 
    WHEN jsonb_array_length(media_urls) > 0 
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

-- Create RPC function for secure public product access with logging
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

-- Create secure categories view for anonymous browsing
CREATE VIEW public.categories_public AS
SELECT 
  slug,
  name,
  description,
  image_url,
  sort_order
FROM categories 
WHERE active = true;

-- Create RPC for public categories access
CREATE FUNCTION public.get_public_categories()
RETURNS SETOF categories_public
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log access for monitoring
  IF auth.uid() IS NULL THEN
    INSERT INTO events (event_type, event_data, created_at)
    VALUES (
      'public_category_access',
      '{"access_type": "anonymous"}'::jsonb,
      now()
    );
  END IF;

  RETURN QUERY
  SELECT * FROM categories_public
  ORDER BY sort_order, name;
END;
$$;