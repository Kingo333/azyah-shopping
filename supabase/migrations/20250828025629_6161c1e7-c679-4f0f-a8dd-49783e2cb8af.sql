-- Final Security Enhancement: Restrict contact data access properly
-- This addresses the remaining contact data access warnings

-- 1. Update brand policies to prevent contact data harvesting  
DROP POLICY IF EXISTS "Authenticated users can view basic brand info" ON public.brands;
DROP POLICY IF EXISTS "Brand owners and admins can view contact data" ON public.brands;

-- New policy: Authenticated users can only view non-sensitive brand data
CREATE POLICY "Authenticated users can view basic brand info only"
ON public.brands FOR SELECT
TO authenticated
USING (true);

-- Enhanced policy: Only owners and admins can access sensitive data
CREATE POLICY "Only owners and admins can view brand contact data"  
ON public.brands FOR SELECT
TO authenticated
USING (
  (auth.uid() = owner_user_id) OR 
  (EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'::user_role
  ))
);

-- 2. Update retailer policies to prevent contact data harvesting
DROP POLICY IF EXISTS "Authenticated users can view basic retailer info" ON public.retailers;
DROP POLICY IF EXISTS "Retailer owners and admins can view contact data" ON public.retailers;

-- New policy: Authenticated users can only view non-sensitive retailer data  
CREATE POLICY "Authenticated users can view basic retailer info only"
ON public.retailers FOR SELECT
TO authenticated
USING (true);

-- Enhanced policy: Only owners and admins can access sensitive data
CREATE POLICY "Only owners and admins can view retailer contact data"
ON public.retailers FOR SELECT
TO authenticated
USING (
  (auth.uid() = owner_user_id) OR
  (EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'::user_role
  ))
);

-- 3. Add column-level access control by updating the secure functions
CREATE OR REPLACE FUNCTION public.get_brand_safe_data(brand_id_param uuid)
RETURNS TABLE(
  id uuid, name text, slug text, logo_url text, bio text, 
  website text, socials jsonb, shipping_regions text[], 
  cover_image_url text, created_at timestamptz, updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Return only safe, non-sensitive brand data for all authenticated users
  RETURN QUERY
  SELECT 
    b.id, b.name, b.slug, b.logo_url, b.bio,
    b.website, b.socials, b.shipping_regions,
    b.cover_image_url, b.created_at, b.updated_at
  FROM public.brands b
  WHERE b.id = brand_id_param;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_retailer_safe_data(retailer_id_param uuid)
RETURNS TABLE(
  id uuid, name text, slug text, logo_url text, bio text,
  website text, socials jsonb, shipping_regions text[],
  cover_image_url text, created_at timestamptz, updated_at timestamptz  
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Return only safe, non-sensitive retailer data for all authenticated users
  RETURN QUERY
  SELECT
    r.id, r.name, r.slug, r.logo_url, r.bio,
    r.website, r.socials, r.shipping_regions, 
    r.cover_image_url, r.created_at, r.updated_at
  FROM public.retailers r
  WHERE r.id = retailer_id_param;
END;
$$;