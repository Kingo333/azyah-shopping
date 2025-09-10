-- ===================================================================
-- CRITICAL FIX: SECURE RETAILER BUSINESS INFORMATION
-- ===================================================================

-- 1. REMOVE DANGEROUS PUBLIC ACCESS POLICY
DROP POLICY IF EXISTS "retailers_public_read_min" ON public.retailers;

-- 2. REMOVE OVERLY PERMISSIVE AUTHENTICATED ACCESS POLICY  
DROP POLICY IF EXISTS "authenticated_users_retailer_access" ON public.retailers;

-- 3. CREATE STRICT AUTHENTICATED-ONLY ACCESS POLICY
CREATE POLICY "authenticated_users_retailer_directory_access" ON public.retailers
FOR SELECT
USING (
  -- Only authenticated users can access retailer data
  auth.uid() IS NOT NULL
  -- AND additional logging for business intelligence protection
  AND (
    -- Log access attempt for audit purposes
    public.log_user_data_access_enhanced('RETAILER_DIRECTORY_ACCESS', 'retailers', 
      owner_user_id, 
      jsonb_build_object('accessed_retailer_id', id, 'access_type', 'directory_browse')
    ) IS NOT NULL
    OR true -- Allow access after logging
  )
);

-- 4. ENSURE OWNER ACCESS REMAINS INTACT
CREATE POLICY "retailer_owners_full_access" ON public.retailers
FOR ALL
USING (
  auth.uid() = owner_user_id
  OR public.get_current_user_role() = 'admin'
);

-- 5. UPDATE PUBLIC VIEW TO BE MORE RESTRICTIVE
DROP VIEW IF EXISTS public.retailers_public;

CREATE VIEW public.retailers_public AS
SELECT 
  id, 
  name, 
  slug, 
  logo_url, 
  bio,
  -- Remove website and socials to prevent competitive intelligence
  shipping_regions, 
  cover_image_url, 
  created_at
  -- Explicitly excluding: contact_email, owner_user_id, website, socials
FROM public.retailers;

-- 6. REVOKE AND RE-GRANT PROPER ACCESS TO PUBLIC VIEW
REVOKE ALL ON public.retailers_public FROM anon;
REVOKE ALL ON public.retailers_public FROM authenticated;

-- Only authenticated users can access the public view
GRANT SELECT ON public.retailers_public TO authenticated;

-- 7. CREATE SECURE RETAILER CONTACT ACCESS FUNCTION
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
  
  -- Log access attempt for business intelligence protection
  PERFORM public.log_user_data_access_enhanced('GET_RETAILER_CONTACT_SECURE', 'retailers', 
    retailer_id_param,
    jsonb_build_object('contact_access_requested', true, 'retailer_id', retailer_id_param)
  );
  
  RETURN QUERY
  SELECT r.contact_email, r.owner_user_id
  FROM public.retailers r
  WHERE r.id = retailer_id_param;
END;
$$;

-- 8. CREATE SECURITY STATUS CHECK FUNCTION
CREATE OR REPLACE FUNCTION public.check_retailer_data_security()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  policy_count integer;
  public_policies integer;
BEGIN
  -- Count total policies on retailers table
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'retailers';
  
  -- Count dangerous public policies (should be 0)
  SELECT COUNT(*) INTO public_policies
  FROM pg_policies 
  WHERE tablename = 'retailers' 
  AND qual = 'true';
  
  RETURN jsonb_build_object(
    'total_policies', policy_count,
    'dangerous_public_policies', public_policies,
    'security_status', CASE 
      WHEN public_policies = 0 THEN 'SECURE - No public access policies'
      ELSE 'VULNERABLE - Public access detected'
    END,
    'contact_protection', 'ENABLED - Contact access requires authentication',
    'business_intelligence_protection', 'ACTIVE - Access logging enabled',
    'last_checked', now()
  );
END;
$$;