-- Create affiliate_links table
CREATE TABLE IF NOT EXISTS public.affiliate_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_name text NOT NULL,
  description text,
  affiliate_url text NOT NULL,
  expiry_date timestamp with time zone,
  is_public boolean DEFAULT false,
  clicks integer DEFAULT 0,
  orders integer DEFAULT 0,
  revenue_cents integer DEFAULT 0,
  commission_rate numeric DEFAULT 0.05,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own affiliate links"
ON public.affiliate_links
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create affiliate links"
ON public.affiliate_links
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own affiliate links"
ON public.affiliate_links
FOR ALL
USING (auth.uid() = user_id);

-- Anyone can view public affiliate links
CREATE POLICY "Anyone can view public affiliate links"
ON public.affiliate_links
FOR SELECT
USING (is_public = true);

-- Create updated_at trigger
CREATE TRIGGER update_affiliate_links_updated_at
BEFORE UPDATE ON public.affiliate_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Fix admin access control - create security definer function first
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Update users table policies to restrict admin data
DROP POLICY IF EXISTS "Anyone can view public user profiles" ON public.users;

CREATE POLICY "Users can view their own profile"
ON public.users
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Non-admins can view other non-admin profiles"
ON public.users
FOR SELECT
USING (
  auth.uid() != id 
  AND public.get_current_user_role() != 'admin'
  AND role != 'admin'
);

CREATE POLICY "Admins can view all profiles"
ON public.users
FOR SELECT
USING (public.get_current_user_role() = 'admin');