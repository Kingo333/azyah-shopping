-- Convert application views to security invoker (PostgreSQL 15+ best practice)
ALTER VIEW public.brands_public SET (security_invoker = on);
ALTER VIEW public.retailers_public SET (security_invoker = on);