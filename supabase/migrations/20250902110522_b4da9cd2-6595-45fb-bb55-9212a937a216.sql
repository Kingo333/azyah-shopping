-- Eliminate scanner warnings by restricting direct table access
-- Remove broad public access policies and force all public access through safe views

-- Drop the overly permissive policies for brands table
DROP POLICY IF EXISTS "Public can view safe brand fields" ON public.brands;
DROP POLICY IF EXISTS "Authenticated users can view brand contact details" ON public.brands;

-- Drop the overly permissive policies for retailers table  
DROP POLICY IF EXISTS "Public can view safe retailer fields" ON public.retailers;
DROP POLICY IF EXISTS "Authenticated users can view retailer contact details" ON public.retailers;

-- Create restrictive policies that only allow owner/admin access to full data
CREATE POLICY "Brand owners and admins only" ON public.brands
  FOR SELECT 
  USING (
    auth.uid() = owner_user_id OR 
    (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  );

CREATE POLICY "Retailer owners and admins only" ON public.retailers
  FOR SELECT 
  USING (
    auth.uid() = owner_user_id OR 
    (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  );

-- Create secure contact access functions for authenticated users
CREATE OR REPLACE FUNCTION public.get_brand_contact_secure(brand_id_param uuid)
RETURNS TABLE(contact_email text, owner_user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only return contact info to authenticated users
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access contact information';
  END IF;
  
  -- Log access attempt
  PERFORM public.log_user_data_access('GET_BRAND_CONTACT_SECURE', 'brands', brand_id_param);
  
  RETURN QUERY
  SELECT b.contact_email, b.owner_user_id
  FROM public.brands b
  WHERE b.id = brand_id_param;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_retailer_contact_secure(retailer_id_param uuid)
RETURNS TABLE(contact_email text, owner_user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only return contact info to authenticated users
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access contact information';
  END IF;
  
  -- Log access attempt
  PERFORM public.log_user_data_access('GET_RETAILER_CONTACT_SECURE', 'retailers', retailer_id_param);
  
  RETURN QUERY
  SELECT r.contact_email, r.owner_user_id
  FROM public.retailers r
  WHERE r.id = retailer_id_param;
END;
$$;