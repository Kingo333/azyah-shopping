-- Fix Security Definer Views by setting them to Security Invoker
-- This ensures views respect the querying user's RLS policies rather than the view creator's

-- Fix brands_public_safe view
ALTER VIEW brands_public_safe SET (security_invoker = on);

-- Fix product_like_counts view  
ALTER VIEW product_like_counts SET (security_invoker = on);

-- Fix retailers_public_safe view
ALTER VIEW retailers_public_safe SET (security_invoker = on);