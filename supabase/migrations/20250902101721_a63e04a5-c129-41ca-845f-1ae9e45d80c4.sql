-- Fix security definer views by converting to security invoker mode
-- This ensures views respect the caller's permissions and RLS policies

ALTER VIEW IF EXISTS public.brands_public SET (security_invoker = on);
ALTER VIEW IF EXISTS public.retailers_public SET (security_invoker = on);
ALTER VIEW IF EXISTS public.products_public SET (security_invoker = on);

-- Fix search_path for existing functions by updating only the ones we can identify
DO $$
DECLARE
    rec RECORD;
BEGIN
    -- Update specific functions that are visible and safe to modify
    FOR rec IN 
        SELECT p.proname
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname IN (
            'get_public_products',
            'get_public_categories', 
            'get_public_brands',
            'get_public_retailers',
            'get_brand_contact_info',
            'get_retailer_contact_info'
        )
    LOOP
        EXECUTE format('ALTER FUNCTION public.%I() SET search_path TO ''public''', rec.proname);
    END LOOP;
END $$;