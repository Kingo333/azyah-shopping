-- Fix: Add referral_code to users_public view so referral validation works
DROP VIEW IF EXISTS users_public;
CREATE VIEW users_public AS
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