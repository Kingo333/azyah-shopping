-- Fix security definer views by converting to security invoker mode
-- This ensures views respect the caller's permissions and RLS policies

ALTER VIEW IF EXISTS public.brands_public SET (security_invoker = on);
ALTER VIEW IF EXISTS public.retailers_public SET (security_invoker = on);
ALTER VIEW IF EXISTS public.products_public SET (security_invoker = on);