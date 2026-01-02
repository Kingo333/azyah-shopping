-- Fix security definer view by using security_invoker = true
DROP VIEW IF EXISTS users_public;
CREATE VIEW users_public 
WITH (security_invoker = true)
AS
SELECT 
  id,
  username,
  name,
  avatar_url,
  referral_code,
  created_at
FROM users;

-- Grant public read access
GRANT SELECT ON users_public TO anon, authenticated;