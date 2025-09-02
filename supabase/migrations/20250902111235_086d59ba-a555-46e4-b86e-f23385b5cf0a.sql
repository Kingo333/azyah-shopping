-- Fix scanner warnings by replacing public views with secure functions
-- Cannot enable RLS on views, so we'll drop them and use secure functions instead
-- ================================================================================

-- 1. DROP PROBLEMATIC PUBLIC VIEWS
-- These views expose business intelligence without authentication controls
DROP VIEW IF EXISTS public.brands_public;
DROP VIEW IF EXISTS public.brands_public_safe;
DROP VIEW IF EXISTS public.retailers_public;  
DROP VIEW IF EXISTS public.retailers_public_safe;
DROP VIEW IF EXISTS public.products_public;

-- 2. CREATE MINIMAL ANONYMOUS-ACCESSIBLE DATA FUNCTIONS
-- Ultra-minimal functions for essential public data (names and logos only)

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

-- 3. CREATE ANONYMOUS CATEGORY LIST (NO BUSINESS METRICS)
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

-- 4. SECURE EXISTING FUNCTIONS TO REQUIRE AUTHENTICATION FOR BUSINESS DATA
-- Update get_public_brands function with authentication requirement
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

-- Update get_public_retailers function with authentication requirement
CREATE OR REPLACE FUNCTION public.get_public_retailers(limit_param integer DEFAULT 50)
RETURNS TABLE(id uuid, name text, slug text, logo_url text, bio text, created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Require authentication to prevent competitive intelligence gathering
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access retailer directory';
  END IF;
  
  -- Log access for monitoring business intelligence access  
  PERFORM public.log_user_data_access('VIEW_RETAILER_DIRECTORY', 'retailers', auth.uid());
  
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.slug,
    r.logo_url,
    r.bio,
    r.created_at,
    r.updated_at
  FROM public.retailers r
  ORDER BY r.name
  LIMIT limit_param;
END;
$$;

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
  
  -- Calculate product counts dynamically to avoid exposing business intelligence
  RETURN QUERY
  SELECT 
    p.category_slug::text as slug,
    INITCAP(REPLACE(p.category_slug::text, '_', ' ')) as name,
    COUNT(*)::bigint as product_count
  FROM public.products p
  WHERE p.status = 'active'
    AND p.category_slug IS NOT NULL
  GROUP BY p.category_slug
  ORDER BY product_count DESC;
END;
$$;

-- Update get_public_products to require authentication
CREATE OR REPLACE FUNCTION public.get_public_products(
  limit_param integer DEFAULT 20, 
  offset_param integer DEFAULT 0, 
  category_filter text DEFAULT NULL
)
RETURNS TABLE(
  id uuid, 
  title text, 
  price_cents integer, 
  currency text, 
  category_slug category_type, 
  subcategory_slug subcategory_type, 
  gender gender_type, 
  image_url text, 
  preview_media jsonb, 
  brand_name text, 
  brand_slug text, 
  brand_logo_url text, 
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Require authentication to prevent competitive product intelligence
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access product catalog';
  END IF;
  
  -- Log product catalog access for monitoring
  PERFORM public.log_user_data_access(
    'VIEW_PRODUCT_CATALOG',
    'products', 
    auth.uid()
  );
  
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.price_cents,
    p.currency,
    p.category_slug,
    p.subcategory_slug,
    p.gender,
    p.image_url,
    p.preview_media,
    b.name as brand_name,
    b.slug as brand_slug,
    b.logo_url as brand_logo_url,
    p.created_at
  FROM public.products p
  LEFT JOIN public.brands b ON b.id = p.brand_id
  WHERE p.status = 'active'
    AND (category_filter IS NULL OR p.category_slug::text = category_filter)
  ORDER BY p.created_at DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$$;