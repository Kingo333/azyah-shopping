-- Fix security definer views by converting to security invoker
-- This ensures views respect the caller's permissions and RLS policies

-- Convert all custom views to security invoker mode
ALTER VIEW IF EXISTS public.brands_public SET (security_invoker = on);
ALTER VIEW IF EXISTS public.retailers_public SET (security_invoker = on);
ALTER VIEW IF EXISTS public.products_public SET (security_invoker = on);

-- Fix function search path for security
-- Update any functions that don't have explicit search_path set
DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Get all functions without explicit search_path
    FOR func_record IN 
        SELECT n.nspname as schema_name, p.proname as function_name
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname NOT LIKE 'pg_%'
        AND p.proname NOT LIKE 'supabase_%'
        AND NOT EXISTS (
            SELECT 1 FROM pg_proc_config pc 
            WHERE pc.oid = p.oid 
            AND pc.proconfig @> ARRAY['search_path=public']
        )
    LOOP
        -- Set search_path for each function
        EXECUTE format('ALTER FUNCTION %I.%I SET search_path TO ''public''', 
                      func_record.schema_name, func_record.function_name);
    END LOOP;
END $$;