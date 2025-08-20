-- Delete user from public.users table first
DELETE FROM public.users WHERE email = 'gabelaka79@gmail.com';

-- Delete user from auth.users table
DELETE FROM auth.users WHERE email = 'gabelaka79@gmail.com';