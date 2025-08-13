-- Fix role assignment to respect user selection during signup
-- Update the handle_new_user function to use the role from signup metadata

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.users (id, email, name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    -- Use the role from signup metadata, default to 'shopper' if not provided
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::user_role,
      'shopper'::user_role
    ),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$function$