-- Fix Security Definer View Warnings
-- Convert views to use security_invoker = on (PostgreSQL 15+ best practice)

ALTER VIEW public.brands_public SET (security_invoker = on);
ALTER VIEW public.retailers_public SET (security_invoker = on);