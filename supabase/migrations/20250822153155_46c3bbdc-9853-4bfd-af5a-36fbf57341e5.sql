-- Fix payments table security policies
-- Drop existing policies that might have security issues
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Service role can manage all payments" ON public.payments;
DROP POLICY IF EXISTS "Users can create their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can update their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;

-- Recreate secure policies using security definer function
-- Users can only view their own payment data
CREATE POLICY "Users can view own payments only" 
ON public.payments 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Users can create payments for themselves only
CREATE POLICY "Users can create own payments only" 
ON public.payments 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Users can update their own payments only (with restrictions)
CREATE POLICY "Users can update own payments only" 
ON public.payments 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Admins can view all payments using security definer function
CREATE POLICY "Admins can view all payments" 
ON public.payments 
FOR SELECT 
USING (public.get_current_user_role() = 'admin'::user_role);

-- Service role maintains full access for system operations
CREATE POLICY "Service role full access" 
ON public.payments 
FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- Ensure RLS is enabled
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Add additional security constraints
-- Ensure amount is always positive
ALTER TABLE public.payments 
ADD CONSTRAINT payments_amount_positive 
CHECK (amount_fils > 0);

-- Ensure tip amount is non-negative
ALTER TABLE public.payments 
ADD CONSTRAINT payments_tip_non_negative 
CHECK (tip_amount_fils >= 0);