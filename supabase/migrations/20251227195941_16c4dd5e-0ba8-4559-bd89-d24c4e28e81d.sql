-- Create secure user_roles table using existing user_role enum
-- This prevents privilege escalation attacks by separating roles from user-editable tables

-- 1. Create the user_roles table using existing user_role enum
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL DEFAULT 'shopper',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 2. Enable Row-Level Security
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function to check roles (bypasses RLS, prevents recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Create function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role 
      WHEN 'admin' THEN 1 
      WHEN 'retailer' THEN 2 
      WHEN 'brand' THEN 3 
      WHEN 'shopper' THEN 4 
    END
  LIMIT 1
$$;

-- 5. RLS Policies for user_roles table
-- Users can only read their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Only service role can manage roles (prevents client-side privilege escalation)
CREATE POLICY "Service role can manage all roles"
ON public.user_roles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 6. Create trigger to auto-create role on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_role user_role;
BEGIN
  -- Get role from user_metadata, default to 'shopper'
  new_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::user_role,
    'shopper'::user_role
  );
  
  -- Insert the role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, new_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block user creation
    RAISE LOG 'Error in handle_new_user_role trigger: % %', SQLERRM, SQLSTATE;
    -- Still try to insert default role
    BEGIN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'shopper'::user_role)
      ON CONFLICT (user_id, role) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    RETURN NEW;
END;
$$;

-- 7. Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- 8. Backfill existing users from public.users table
INSERT INTO public.user_roles (user_id, role)
SELECT 
  u.id,
  COALESCE(pu.role, 'shopper'::user_role)
FROM auth.users u
LEFT JOIN public.users pu ON u.id = pu.id
ON CONFLICT (user_id, role) DO NOTHING;

-- 9. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);