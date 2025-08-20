-- Fix the security definer view issue from the linter
-- Remove the security barrier from the view and rely on RLS instead
DROP VIEW IF EXISTS public.products_public;

-- Instead of a view, we'll handle access control through RLS policies
-- The existing tiered access policies we created are sufficient