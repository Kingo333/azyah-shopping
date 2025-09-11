-- Clean up user data for abdullahiking33@gmail.com
-- Delete from public.users table
DELETE FROM public.users WHERE id = 'e86d58c9-a1f0-4c25-bbdb-6bec44850be5';

-- Also clean up any potential auth.users entry (in case it exists)
-- Note: This would normally be done through Supabase admin panel, but we'll try programmatically
DO $$
BEGIN
  -- Try to delete from auth.users if it exists
  DELETE FROM auth.users WHERE id = 'e86d58c9-a1f0-4c25-bbdb-6bec44850be5';
EXCEPTION WHEN OTHERS THEN
  -- If it fails (user doesn't exist in auth), that's fine
  NULL;
END $$;