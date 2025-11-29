-- Create a public view that exposes only safe profile fields
CREATE OR REPLACE VIEW users_public AS
SELECT 
  id,
  username,
  name,
  avatar_url,
  created_at
FROM users;

-- Grant SELECT to all authenticated and anonymous users
GRANT SELECT ON users_public TO authenticated;
GRANT SELECT ON users_public TO anon;