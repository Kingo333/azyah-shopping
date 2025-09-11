-- Disable the existing database trigger to prevent conflicts with webhook
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Also remove the trigger function since we're using webhook now
DROP FUNCTION IF EXISTS public.handle_new_user();