-- Fix Security Definer Views: Convert to security_invoker
-- This resolves the Supabase security advisor warnings for application views

-- Convert brands_public view to security invoker
ALTER VIEW public.brands_public SET (security_invoker = on);

-- Convert retailers_public view to security invoker  
ALTER VIEW public.retailers_public SET (security_invoker = on);

-- Verify the changes took effect
SELECT 
  schemaname,
  viewname,
  CASE 
    WHEN 'security_invoker=on' = ANY(reloptions) OR 'security_invoker=true' = ANY(reloptions) 
    THEN 'security_invoker' 
    ELSE 'security_definer' 
  END as security_mode
FROM pg_views v
JOIN pg_class c ON c.relname = v.viewname AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = v.schemaname)
WHERE schemaname = 'public' 
  AND viewname IN ('brands_public', 'retailers_public');