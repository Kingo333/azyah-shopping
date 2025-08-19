-- Check if user_role enum exists, create if not
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('shopper', 'brand', 'retailer', 'admin');
    END IF;
END $$;

-- Ensure users table has proper structure for OAuth
-- The table should already exist, but let's make sure it supports OAuth properly
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'email',
ADD COLUMN IF NOT EXISTS provider_id TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMP WITH TIME ZONE;

-- Create unique constraint for provider combinations
CREATE UNIQUE INDEX IF NOT EXISTS users_provider_unique 
ON public.users(provider, provider_id) 
WHERE provider_id IS NOT NULL;

-- Update the handle_new_user function to support OAuth providers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
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

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Update sync_user_role_with_metadata to handle OAuth updates
CREATE OR REPLACE FUNCTION public.sync_user_role_with_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- Ensure the metadata sync trigger exists
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.sync_user_role_with_metadata();