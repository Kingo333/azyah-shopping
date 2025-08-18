-- Ensure users table has consistent role data with auth metadata
-- Add a trigger to sync user roles with auth metadata on updates

CREATE OR REPLACE FUNCTION public.sync_user_role_with_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Update user role in database to match auth metadata when user signs in
  -- This ensures consistency between auth.users.user_metadata.role and public.users.role
  
  -- Only update if the role in metadata is different from database role
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL 
     AND NEW.raw_user_meta_data->>'role' != OLD.raw_user_meta_data->>'role' THEN
    
    UPDATE public.users 
    SET 
      role = (NEW.raw_user_meta_data->>'role')::user_role,
      updated_at = NOW()
    WHERE id = NEW.id;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to sync user roles
DROP TRIGGER IF EXISTS sync_user_role_trigger ON auth.users;
CREATE TRIGGER sync_user_role_trigger
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data)
  EXECUTE FUNCTION public.sync_user_role_with_metadata();

-- Ensure existing users have their metadata role synced to database
UPDATE public.users 
SET role = COALESCE(
  (
    SELECT (auth_users.raw_user_meta_data->>'role')::user_role 
    FROM auth.users auth_users 
    WHERE auth_users.id = users.id
  ), 
  users.role
)
WHERE EXISTS (
  SELECT 1 FROM auth.users auth_users 
  WHERE auth_users.id = users.id 
  AND auth_users.raw_user_meta_data->>'role' IS NOT NULL
);