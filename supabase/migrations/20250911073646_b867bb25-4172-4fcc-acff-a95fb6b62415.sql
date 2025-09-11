-- Create brand portals for existing brand users who don't have them yet
INSERT INTO public.brands (
  id,
  name,
  slug,
  owner_user_id,
  contact_email,
  bio,
  website,
  socials,
  shipping_regions,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  u.name,
  LOWER(REGEXP_REPLACE(u.name, '[^a-zA-Z0-9]', '-', 'g')),
  u.id,
  u.email,
  NULL,
  NULL,
  '{}',
  '{}',
  NOW(),
  NOW()
FROM public.users u
WHERE u.role = 'brand'
  AND NOT EXISTS (
    SELECT 1 FROM public.brands b WHERE b.owner_user_id = u.id
  );