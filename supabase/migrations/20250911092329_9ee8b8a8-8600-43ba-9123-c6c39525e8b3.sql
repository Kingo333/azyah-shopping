-- Complete signup flow improvements with database trigger
-- 1. Create updated trigger for user setup that handles all user types
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role user_role;
  default_name text;
  default_slug text;
BEGIN
  -- Extract role from user metadata, default to 'shopper'
  user_role := COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'shopper'::user_role);
  default_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name', 
    split_part(NEW.email, '@', 1)
  );

  -- Create user record in public.users table
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
  ) VALUES (
    NEW.id,
    NEW.email,
    default_name,
    user_role,
    COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
    CASE 
      WHEN COALESCE(NEW.raw_app_meta_data->>'provider', 'email') = 'google' 
      THEN NEW.raw_user_meta_data->>'provider_id'
      ELSE NULL 
    END,
    NEW.raw_user_meta_data->>'avatar_url',
    NOW(),
    NOW()
  );

  -- If role is 'brand', create brand record
  IF user_role = 'brand' THEN
    default_slug := lower(regexp_replace(default_name, '[^a-zA-Z0-9]', '-', 'g'));
    default_slug := regexp_replace(default_slug, '-+', '-', 'g');
    default_slug := trim(both '-' from default_slug);
    
    INSERT INTO public.brands (
      owner_user_id,
      name,
      slug,
      contact_email,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      default_name,
      default_slug || '-' || extract(epoch from now())::text,
      NEW.email,
      NOW(),
      NOW()
    );
  END IF;

  -- If role is 'retailer', create retailer record  
  IF user_role = 'retailer' THEN
    default_slug := lower(regexp_replace(default_name, '[^a-zA-Z0-9]', '-', 'g'));
    default_slug := regexp_replace(default_slug, '-+', '-', 'g');
    default_slug := trim(both '-' from default_slug);
    
    INSERT INTO public.retailers (
      owner_user_id,
      name,
      slug,
      contact_email,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      default_name,
      default_slug || '-' || extract(epoch from now())::text,
      NEW.email,
      NOW(),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();