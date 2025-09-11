-- Manually verify email for user ayshalm442@gmail.com
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email = 'ayshalm442@gmail.com' AND email_confirmed_at IS NULL;