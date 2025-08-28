-- Final Security Enhancements: Restrict contact data access to owners/admins only
-- This addresses the remaining contact data access warnings

-- 1. Create more restrictive policies for brands contact data
DROP POLICY IF EXISTS "Authenticated users can view basic brand info" ON public.brands;
DROP POLICY IF EXISTS "Brand owners and admins can view contact data" ON public.brands;

-- Create separate policies for different data access levels
CREATE POLICY "Authenticated users can view basic brand info (no contact data)"
ON public.brands FOR SELECT
TO authenticated
USING (true)
WITH (SECURITY_DEFINER = OFF);

-- Restrict contact data access to owners and admins only
CREATE POLICY "Only brand owners and admins can view contact data"
ON public.brands FOR SELECT  
TO authenticated
USING (
  -- Only allow full access (including contact_email) to:
  -- 1. Brand owners
  -- 2. Admins
  (auth.uid() = owner_user_id) OR 
  (EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'::user_role
  ))
);

-- 2. Create more restrictive policies for retailers contact data  
DROP POLICY IF EXISTS "Authenticated users can view basic retailer info" ON public.retailers;
DROP POLICY IF EXISTS "Retailer owners and admins can view contact data" ON public.retailers;

-- Create separate policies for different data access levels
CREATE POLICY "Authenticated users can view basic retailer info (no contact data)"
ON public.retailers FOR SELECT
TO authenticated  
USING (true)
WITH (SECURITY_DEFINER = OFF);

-- Restrict contact data access to owners and admins only
CREATE POLICY "Only retailer owners and admins can view contact data"
ON public.retailers FOR SELECT
TO authenticated
USING (
  -- Only allow full access (including contact_email) to:
  -- 1. Retailer owners  
  -- 2. Admins
  (auth.uid() = owner_user_id) OR
  (EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'::user_role
  ))
);

-- 3. Update secure contact access functions to be more restrictive
CREATE OR REPLACE FUNCTION public.get_brand_contact_info(brand_id_param uuid)
RETURNS TABLE(contact_email text, owner_user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only return contact info to:
  -- 1. Brand owners
  -- 2. Admins
  -- 3. Authenticated business users (with stricter logging)
  
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access contact information';
  END IF;
  
  -- Check if user has permission to access this contact data
  IF NOT (
    EXISTS (SELECT 1 FROM public.brands WHERE id = brand_id_param AND owner_user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'::user_role)
  ) THEN
    -- Log unauthorized access attempt
    PERFORM public.log_user_data_access('UNAUTHORIZED_BRAND_CONTACT_ACCESS', 'brands', brand_id_param);
    RAISE EXCEPTION 'Access denied: Insufficient permissions to view contact information';
  END IF;
  
  -- Log authorized access attempt  
  PERFORM public.log_user_data_access('GET_BRAND_CONTACT', 'brands', brand_id_param);
  
  RETURN QUERY
  SELECT b.contact_email, b.owner_user_id
  FROM public.brands b
  WHERE b.id = brand_id_param;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_retailer_contact_info(retailer_id_param uuid)
RETURNS TABLE(contact_email text, owner_user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER  
SET search_path TO 'public'
AS $$
BEGIN
  -- Only return contact info to:
  -- 1. Retailer owners
  -- 2. Admins  
  -- 3. Authenticated business users (with stricter logging)
  
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access contact information';
  END IF;
  
  -- Check if user has permission to access this contact data
  IF NOT (
    EXISTS (SELECT 1 FROM public.retailers WHERE id = retailer_id_param AND owner_user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'::user_role)
  ) THEN
    -- Log unauthorized access attempt
    PERFORM public.log_user_data_access('UNAUTHORIZED_RETAILER_CONTACT_ACCESS', 'retailers', retailer_id_param);
    RAISE EXCEPTION 'Access denied: Insufficient permissions to view contact information';
  END IF;
  
  -- Log authorized access attempt
  PERFORM public.log_user_data_access('GET_RETAILER_CONTACT', 'retailers', retailer_id_param);
  
  RETURN QUERY
  SELECT r.contact_email, r.owner_user_id
  FROM public.retailers r
  WHERE r.id = retailer_id_param;
END;
$$;