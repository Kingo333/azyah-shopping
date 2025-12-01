-- Update the handle_new_user trigger to properly detect OAuth provider
-- and ensure it correctly sets the provider field for OAuth users

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  detected_role text;
  detected_provider text;
BEGIN
  -- Extract role from user metadata, default to 'shopper'
  detected_role := COALESCE(NEW.raw_user_meta_data->>'role', 'shopper');
  
  -- Detect provider: check app_metadata first, then default to 'email'
  detected_provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');
  
  -- Insert user record with detected role and provider
  INSERT INTO public.users (
    id,
    email,
    role,
    provider,
    onboarding_completed,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    detected_role::user_role,
    detected_provider,
    false,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    provider = EXCLUDED.provider,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;