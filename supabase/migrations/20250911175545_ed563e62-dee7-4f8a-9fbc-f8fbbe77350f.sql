-- Remove orphaned users that exist in public.users but not in auth.users
DELETE FROM public.users 
WHERE email IN ('ayshaalm442@gmail.com', 'ayshalm442@gmail.com')
AND id NOT IN (SELECT id FROM auth.users);