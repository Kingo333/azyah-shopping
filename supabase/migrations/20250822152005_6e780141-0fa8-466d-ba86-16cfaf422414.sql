-- Fix payments table security policies
-- Drop existing policies to recreate them with proper admin access
DROP POLICY IF EXISTS "Service can manage all payments" ON public.payments;
DROP POLICY IF EXISTS "Users can create their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;

-- Create comprehensive security policies for payments table
-- Users can only view their own payments
CREATE POLICY "Users can view their own payments" 
ON public.payments 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can only create payments for themselves
CREATE POLICY "Users can create their own payments" 
ON public.payments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own payments (limited fields)
CREATE POLICY "Users can update their own payments" 
ON public.payments 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Admins can view all payment data for business analytics
CREATE POLICY "Admins can view all payments" 
ON public.payments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'admin'::user_role
  )
);

-- Service role can manage all payments (for webhooks and system operations)
CREATE POLICY "Service role can manage all payments" 
ON public.payments 
FOR ALL 
USING (auth.role() = 'service_role'::text);