-- Security Enhancement: Restrict public product data access and create safe public views

-- Create safe public products view with limited fields only
CREATE OR REPLACE VIEW public.products_public AS
SELECT 
  p.id,
  p.title,
  p.price_cents,
  p.currency,
  p.category_slug,
  p.subcategory_slug,
  p.gender,
  p.image_url,
  -- Only first media URL for preview
  CASE 
    WHEN jsonb_array_length(p.media_urls) > 0 
    THEN jsonb_build_array(p.media_urls->0)
    ELSE '[]'::jsonb
  END as preview_media,
  p.created_at,
  -- Safe brand info only
  b.name as brand_name,
  b.slug as brand_slug,
  b.logo_url as brand_logo_url
FROM products p
LEFT JOIN brands b ON b.id = p.brand_id
WHERE p.status = 'active';

-- Set security invoker for the new view
ALTER VIEW public.products_public SET (security_invoker = on);

-- Create safe public categories view
CREATE OR REPLACE VIEW public.categories_public AS
SELECT 
  category_slug as slug,
  category_slug as name,
  COUNT(*) as product_count
FROM products 
WHERE status = 'active'
GROUP BY category_slug
ORDER BY product_count DESC;

-- Set security invoker for categories view
ALTER VIEW public.categories_public SET (security_invoker = on);

-- Update products table RLS to require authentication for full access
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;

-- New policy: Authenticated users get full product access
CREATE POLICY "Authenticated users can view full product details"
  ON public.products
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL AND 
    status = 'active'
  );

-- New policy: Anonymous users cannot access products table directly
CREATE POLICY "Block anonymous product access"
  ON public.products
  FOR SELECT 
  USING (false);

-- Update categories table RLS to require authentication
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;

-- New policy: Only authenticated users can view categories
CREATE POLICY "Authenticated users can view categories"
  ON public.categories
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL AND 
    active = true
  );

-- Block anonymous access to categories
CREATE POLICY "Block anonymous category access"
  ON public.categories
  FOR SELECT 
  USING (false);

-- Create function for safe public product access
CREATE OR REPLACE FUNCTION public.get_public_products(
  limit_param INTEGER DEFAULT 20,
  offset_param INTEGER DEFAULT 0,
  category_filter TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  price_cents INTEGER,
  currency TEXT,
  category_slug category_type,
  subcategory_slug subcategory_type,
  gender gender_type,
  image_url TEXT,
  preview_media JSONB,
  brand_name TEXT,
  brand_slug TEXT,
  brand_logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log public access attempt for monitoring
  PERFORM public.log_user_data_access(
    'VIEW_PUBLIC_PRODUCTS', 
    'products_public', 
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
  );
  
  RETURN QUERY
  SELECT 
    pp.id,
    pp.title,
    pp.price_cents,
    pp.currency,
    pp.category_slug,
    pp.subcategory_slug,
    pp.gender,
    pp.image_url,
    pp.preview_media,
    pp.brand_name,
    pp.brand_slug,
    pp.brand_logo_url,
    pp.created_at
  FROM public.products_public pp
  WHERE 
    CASE 
      WHEN category_filter IS NOT NULL 
      THEN pp.category_slug::text = category_filter
      ELSE true
    END
  ORDER BY pp.created_at DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$$;

-- Create function for safe public categories
CREATE OR REPLACE FUNCTION public.get_public_categories()
RETURNS TABLE(
  slug TEXT,
  name TEXT,
  product_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log category access for monitoring
  PERFORM public.log_user_data_access(
    'VIEW_PUBLIC_CATEGORIES', 
    'categories_public',
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
  );
  
  RETURN QUERY
  SELECT 
    cp.slug,
    cp.name,
    cp.product_count
  FROM public.categories_public cp
  ORDER BY cp.product_count DESC;
END;
$$;