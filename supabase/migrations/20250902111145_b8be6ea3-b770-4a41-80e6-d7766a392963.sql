-- Eliminate scanner warnings by securing all public views and business data
-- =====================================================================

-- 1. SECURE BRANDS_PUBLIC AND BRANDS_PUBLIC_SAFE VIEWS
-- Enable RLS on public brand views to prevent anonymous access
ALTER TABLE public.brands_public ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands_public_safe ENABLE ROW LEVEL SECURITY;

-- Add authentication requirement for brands_public
CREATE POLICY "authenticated_users_only_brands_public"
ON public.brands_public
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Add authentication requirement for brands_public_safe  
CREATE POLICY "authenticated_users_only_brands_public_safe"
ON public.brands_public_safe
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 2. SECURE RETAILERS_PUBLIC AND RETAILERS_PUBLIC_SAFE VIEWS
-- Enable RLS on public retailer views to prevent anonymous access
ALTER TABLE public.retailers_public ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retailers_public_safe ENABLE ROW LEVEL SECURITY;

-- Add authentication requirement for retailers_public
CREATE POLICY "authenticated_users_only_retailers_public"
ON public.retailers_public
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Add authentication requirement for retailers_public_safe
CREATE POLICY "authenticated_users_only_retailers_public_safe"
ON public.retailers_public_safe
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 3. SECURE PRODUCTS_PUBLIC VIEW
-- Enable RLS on products_public to prevent anonymous access to product metrics
ALTER TABLE public.products_public ENABLE ROW LEVEL SECURITY;

-- Add authentication requirement for products_public
CREATE POLICY "authenticated_users_only_products_public"
ON public.products_public
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 4. CREATE MINIMAL ANONYMOUS-ACCESSIBLE DATA FUNCTIONS
-- Create ultra-minimal functions for essential public data (names and logos only)

CREATE OR REPLACE FUNCTION public.get_minimal_brand_directory()
RETURNS TABLE(
  id uuid,
  name text,
  slug text,
  logo_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Return only essential brand info for anonymous directory browsing
  -- No contact info, no social links, no business details
  RETURN QUERY
  SELECT 
    b.id,
    b.name,
    b.slug,
    b.logo_url
  FROM public.brands b
  WHERE b.name IS NOT NULL
  ORDER BY b.name
  LIMIT 100;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_minimal_retailer_directory()
RETURNS TABLE(
  id uuid,
  name text,
  slug text,
  logo_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Return only essential retailer info for anonymous directory browsing
  -- No contact info, no social links, no business details
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.slug,
    r.logo_url
  FROM public.retailers r
  WHERE r.name IS NOT NULL
  ORDER BY r.name
  LIMIT 100;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_minimal_product_catalog(
  limit_param INTEGER DEFAULT 20,
  offset_param INTEGER DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  title text,
  price_cents integer,
  currency text,
  category_slug category_type,
  image_url text,
  brand_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Return only basic product info for anonymous browsing
  -- No engagement metrics, no detailed media, no business intelligence
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.price_cents,
    p.currency,
    p.category_slug,
    p.image_url,
    b.name as brand_name
  FROM public.products p
  LEFT JOIN public.brands b ON b.id = p.brand_id
  WHERE p.status = 'active'
    AND p.title IS NOT NULL
  ORDER BY p.created_at DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$$;

-- 5. UPDATE EXISTING SECURE FUNCTIONS TO LOG ACCESS
-- Enhance get_public_brands function with better security
CREATE OR REPLACE FUNCTION public.get_public_brands(limit_param integer DEFAULT 50)
RETURNS TABLE(id uuid, name text, slug text, logo_url text, bio text, created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Require authentication to prevent competitive intelligence gathering
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access brand directory';
  END IF;
  
  -- Log access for monitoring business intelligence access
  PERFORM public.log_user_data_access('VIEW_BRAND_DIRECTORY', 'brands', auth.uid());
  
  RETURN QUERY
  SELECT 
    b.id,
    b.name,
    b.slug,
    b.logo_url,
    b.bio,
    b.created_at,
    b.updated_at
  FROM public.brands b
  ORDER BY b.name
  LIMIT limit_param;
END;
$$;

-- 6. SECURE CATEGORIES ACCESS
-- Update get_public_categories to require authentication for business metrics
CREATE OR REPLACE FUNCTION public.get_public_categories()
RETURNS TABLE(slug text, name text, product_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Require authentication to prevent competitive market analysis
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access category metrics';
  END IF;
  
  -- Log category metrics access for audit
  PERFORM public.log_user_data_access(
    'VIEW_CATEGORY_METRICS', 
    'categories',
    auth.uid()
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

-- 7. CREATE ANONYMOUS CATEGORY LIST (NO METRICS)
CREATE OR REPLACE FUNCTION public.get_minimal_category_list()
RETURNS TABLE(slug text, name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Return category names only, no business metrics
  RETURN QUERY
  SELECT DISTINCT
    p.category_slug::text as slug,
    INITCAP(REPLACE(p.category_slug::text, '_', ' ')) as name
  FROM public.products p
  WHERE p.status = 'active'
    AND p.category_slug IS NOT NULL
  ORDER BY name;
END;
$$;