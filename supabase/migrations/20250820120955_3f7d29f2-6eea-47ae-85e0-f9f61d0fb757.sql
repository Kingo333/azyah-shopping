-- Fix the handle_new_user function to use correct field names
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Determine provider from raw_app_meta_data, not app_metadata
  DECLARE
    user_provider TEXT := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');
    user_provider_id TEXT := CASE 
      WHEN user_provider = 'google' THEN NEW.raw_user_meta_data->>'provider_id'
      ELSE NULL 
    END;
  BEGIN
    INSERT INTO public.users (
      id, 
      email, 
      name, 
      role, 
      provider,
      provider_id,
      avatar_url,
      created_at, 
      updated_at
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(
        NEW.raw_user_meta_data->>'name', 
        NEW.raw_user_meta_data->>'full_name',
        split_part(NEW.email, '@', 1)
      ),
      -- Use the role from signup metadata, default to 'shopper' if not provided
      COALESCE(
        (NEW.raw_user_meta_data->>'role')::user_role,
        'shopper'::user_role
      ),
      user_provider,
      user_provider_id,
      NEW.raw_user_meta_data->>'avatar_url',
      NOW(),
      NOW()
    );
    RETURN NEW;
  END;
END;
$function$;

-- Drop the duplicate sync_user_role_trigger if it exists
DROP TRIGGER IF EXISTS sync_user_role_trigger ON auth.users;

-- Ensure the main trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();