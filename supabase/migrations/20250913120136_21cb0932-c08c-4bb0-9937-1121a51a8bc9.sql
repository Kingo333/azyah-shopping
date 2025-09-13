-- Fix security definer view warnings by converting to security invoker
-- This resolves the linter errors for brands_public and retailers_public views

-- Convert brands_public view to security invoker (PostgreSQL 15+ best practice)
ALTER VIEW public.brands_public SET (security_invoker = on);

-- Convert retailers_public view to security invoker (PostgreSQL 15+ best practice)  
ALTER VIEW public.retailers_public SET (security_invoker = on);

-- Verify the changes (these queries will show security_invoker = true)
-- SELECT schemaname, viewname, security_invoker FROM pg_views WHERE viewname IN ('brands_public', 'retailers_public');