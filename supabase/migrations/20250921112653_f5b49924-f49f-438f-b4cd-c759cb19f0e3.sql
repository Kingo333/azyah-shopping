-- Fix security definer view warnings by converting to security invoker mode
-- This ensures views respect the caller's permissions rather than the owner's

-- Convert product views to security invoker (PostgreSQL 15+ best practice)
ALTER VIEW public.products_public SET (security_invoker = on);
ALTER VIEW public.categories_public SET (security_invoker = on);