-- Enhanced security for customer payment information in subscriptions table
-- Step 1: Add audit logging for subscription access
CREATE OR REPLACE FUNCTION public.log_subscription_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log any access to subscription data
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    table_name,
    accessed_user_id,
    ip_address
  ) VALUES (
    auth.uid(),
    TG_OP || '_SUBSCRIPTION',
    'subscriptions',
    CASE 
      WHEN TG_OP = 'SELECT' THEN OLD.user_id
      ELSE NEW.user_id
    END,
    inet_client_addr()
  );
  
  RETURN CASE TG_OP
    WHEN 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create audit trigger for subscription access
CREATE TRIGGER audit_subscription_access
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.log_subscription_access();

-- Step 2: Create a secure view for subscription status (without sensitive payment details)
CREATE OR REPLACE VIEW public.subscription_status AS
SELECT 
  id,
  user_id,
  plan,
  status,
  current_period_end,
  created_at
  -- Deliberately exclude: last_payment_intent_id, last_payment_status, current_period_start, updated_at
FROM public.subscriptions
WHERE auth.uid() = user_id;

COMMENT ON VIEW public.subscription_status IS 'Safe view of subscription data without sensitive payment information';

-- Step 3: Create function to safely get subscription status for current user
CREATE OR REPLACE FUNCTION public.get_my_subscription_status()
RETURNS TABLE(
  subscription_id UUID,
  plan TEXT,
  status TEXT,
  is_active BOOLEAN,
  expires_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Log the access attempt
  PERFORM public.log_user_data_access('GET_SUBSCRIPTION_STATUS', 'subscriptions', auth.uid());
  
  RETURN QUERY
  SELECT 
    s.id as subscription_id,
    s.plan,
    s.status,
    (s.status = 'active' AND s.current_period_end > NOW()) as is_active,
    s.current_period_end as expires_at
  FROM public.subscriptions s
  WHERE s.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 4: Strengthen existing RLS policies with additional checks
-- Drop existing policies to recreate with stronger security
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can create their own subscription" ON public.subscriptions;

-- Create enhanced RLS policies
CREATE POLICY "Users can view only their own subscription"
ON public.subscriptions
FOR SELECT
USING (
  auth.uid() = user_id 
  AND auth.uid() IS NOT NULL  -- Ensure user is authenticated
);

CREATE POLICY "Users can update only their own subscription"
ON public.subscriptions
FOR UPDATE
USING (
  auth.uid() = user_id 
  AND auth.uid() IS NOT NULL  -- Ensure user is authenticated
);

CREATE POLICY "Users can create only their own subscription"
ON public.subscriptions
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND auth.uid() IS NOT NULL  -- Ensure user is authenticated
);

-- Step 5: Create admin function for subscription management (for support purposes)
CREATE OR REPLACE FUNCTION public.admin_get_subscription_details(target_user_id UUID)
RETURNS TABLE(
  subscription_id UUID,
  user_email TEXT,
  plan TEXT,
  status TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  last_payment_status TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Only allow if current user is admin
  IF public.get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  -- Log admin access to subscription data
  PERFORM public.log_user_data_access('ADMIN_VIEW_SUBSCRIPTION', 'subscriptions', target_user_id);
  
  RETURN QUERY
  SELECT 
    s.id as subscription_id,
    u.email as user_email,
    s.plan,
    s.status,
    s.current_period_start,
    s.current_period_end,
    s.last_payment_status,
    s.created_at
  FROM public.subscriptions s
  JOIN public.users u ON u.id = s.user_id
  WHERE s.user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;