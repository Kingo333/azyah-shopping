-- Fix brand auto-creation for authenticated brand users
-- Create missing brand record for abdullahiking33@gmail.com

-- First, add unique constraint on owner_user_id to prevent duplicate brands per user
ALTER TABLE public.brands ADD CONSTRAINT brands_owner_user_id_unique UNIQUE (owner_user_id);

-- Create the missing brand record for the existing brand user
INSERT INTO public.brands (
  id,
  owner_user_id,
  name,
  slug,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'c824f562-d1ea-41c4-8d40-0d620e11b1ba', -- abdullahiking33@gmail.com user id
  'Abdullah''s Brand',
  'abdullah-brand-' || extract(epoch from now())::text,
  now(),
  now()
);

-- Ensure brand creation policies are working correctly
-- Drop and recreate the brand policies to fix any issues
DROP POLICY IF EXISTS "Brand owners can manage their brands" ON public.brands;
DROP POLICY IF EXISTS "Authenticated users can create brands" ON public.brands;
DROP POLICY IF EXISTS "Brand owners can view their brands" ON public.brands;

-- Create comprehensive brand policies
CREATE POLICY "Brand owners can manage their brands" 
    ON public.brands FOR ALL 
    USING (auth.uid() = owner_user_id);

CREATE POLICY "Authenticated users can create brands" 
    ON public.brands FOR INSERT 
    WITH CHECK (auth.uid() = owner_user_id AND auth.uid() IS NOT NULL);