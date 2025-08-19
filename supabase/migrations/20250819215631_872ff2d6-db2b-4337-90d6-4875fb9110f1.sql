-- Fix security issues by setting proper search_path for all functions

-- Update handle_new_user function with proper search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Determine provider
  DECLARE
    user_provider TEXT := COALESCE(NEW.app_metadata->>'provider', 'email');
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
$$;

-- Update sync_user_role_with_metadata function with proper search_path
CREATE OR REPLACE FUNCTION public.sync_user_role_with_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Update user data when metadata changes (like from OAuth callback)
  IF NEW.raw_user_meta_data IS DISTINCT FROM OLD.raw_user_meta_data THEN
    UPDATE public.users 
    SET 
      role = COALESCE((NEW.raw_user_meta_data->>'role')::user_role, role),
      name = COALESCE(
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'full_name', 
        name
      ),
      avatar_url = COALESCE(NEW.raw_user_meta_data->>'avatar_url', avatar_url),
      updated_at = NOW(),
      last_sign_in_at = NOW()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;