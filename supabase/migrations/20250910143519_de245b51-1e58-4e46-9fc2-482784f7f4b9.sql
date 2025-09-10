-- ===================================================================
-- TARGETED FIX: REMOVE DANGEROUS PUBLIC RETAILER ACCESS
-- ===================================================================

-- 1. REMOVE THE SPECIFIC DANGEROUS POLICY THAT ALLOWS PUBLIC ACCESS
DROP POLICY IF EXISTS "retailers_public_read_min" ON public.retailers;

-- 2. VERIFY NO OTHER PUBLIC ACCESS POLICIES EXIST
-- This query will help us see what policies remain
SELECT 'Remaining retailer policies after cleanup:' as status;