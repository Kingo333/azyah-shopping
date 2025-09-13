-- CRITICAL SECURITY FIXES: Brand & Retailer Contact Data Protection (Fixed Structure)
-- ====================================================================================

-- 1. DROP AND RECREATE RLS POLICIES PROPERLY
-- First handle brands table policies
DROP POLICY IF EXISTS "Public can view basic brand info" ON public.brands;
DROP POLICY IF EXISTS "Authenticated users can view brand contact details" ON public.brands;

-- Create new restrictive policies for brands
CREATE POLICY "Authenticated users can view brand contact details" ON public.brands  
FOR SELECT USING (auth.uid() IS NOT NULL);

-- 2. Handle retailers table policies  
DROP POLICY IF EXISTS "Public can view basic retailer info" ON public.retailers;
DROP POLICY IF EXISTS "Authenticated users can view retailer contact details" ON public.retailers;

-- Create new restrictive policies for retailers
CREATE POLICY "Authenticated users can view retailer contact details" ON public.retailers
FOR SELECT USING (auth.uid() IS NOT NULL);

-- 3. DROP AND RECREATE VIEWS WITH CORRECT STRUCTURE
DROP VIEW IF EXISTS public.brands_public CASCADE;
DROP VIEW IF EXISTS public.retailers_public CASCADE;

-- Create safe public views that exclude sensitive fields
CREATE VIEW public.brands_public AS
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

CREATE VIEW public.retailers_public AS
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