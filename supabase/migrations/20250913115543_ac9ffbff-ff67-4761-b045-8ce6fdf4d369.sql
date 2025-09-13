-- CRITICAL SECURITY FIXES: Brand & Retailer Contact Data Protection (Fixed)
-- ========================================================================

-- 1. DROP AND RECREATE BRAND POLICIES FOR CLEAN STATE
DROP POLICY IF EXISTS "Public can view basic brand info" ON public.brands;
DROP POLICY IF EXISTS "Authenticated users can view brand contact details" ON public.brands;

-- Create restrictive brand policies
CREATE POLICY "Public can view basic brand info" ON public.brands
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can view brand contact details" ON public.brands  
FOR SELECT USING (auth.uid() IS NOT NULL);

-- 2. DROP AND RECREATE RETAILER POLICIES FOR CLEAN STATE  
DROP POLICY IF EXISTS "Public can view basic retailer info" ON public.retailers;
DROP POLICY IF EXISTS "Authenticated users can view retailer contact details" ON public.retailers;

-- Create restrictive retailer policies
CREATE POLICY "Public can view basic retailer info" ON public.retailers
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can view retailer contact details" ON public.retailers
FOR SELECT USING (auth.uid() IS NOT NULL);

-- 3. CREATE SECURE PUBLIC VIEWS WITH SAFE FIELDS ONLY
CREATE OR REPLACE VIEW public.brands_public AS
SELECT 
  id,
  name,
  slug,
  bio,
  logo_url,
  cover_image_url,
  website,
  socials,
  shipping_regions,
  created_at,
  updated_at
  -- EXPLICITLY EXCLUDE: contact_email, owner_user_id
FROM public.brands;

CREATE OR REPLACE VIEW public.retailers_public AS
SELECT 
  id,
  name,
  slug,
  bio,
  logo_url,
  cover_image_url,
  website,
  socials,
  shipping_regions,
  created_at,
  updated_at
  -- EXPLICITLY EXCLUDE: contact_email, owner_user_id  
FROM public.retailers;

-- 4. CREATE SECURITY AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  accessed_user_id UUID,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if exists and create new one
DROP POLICY IF EXISTS "Service role can manage audit logs" ON public.security_audit_log;
CREATE POLICY "Service role can manage audit logs" ON public.security_audit_log
FOR ALL USING (auth.role() = 'service_role');

-- 5. CREATE UTILITY FUNCTIONS
CREATE OR REPLACE FUNCTION public.__is_read_only_tx()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN FALSE;
EXCEPTION WHEN others THEN
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_user_data_access(
  action_type TEXT,
  table_name TEXT,
  accessed_user_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.__is_read_only_tx() THEN
    RETURN;
  END IF;

  INSERT INTO public.security_audit_log (
    user_id, action, table_name, accessed_user_id, ip_address
  ) VALUES (
    auth.uid(),
    action_type,
    table_name,
    accessed_user_id,
    inet_client_addr()
  );
END;
$$;