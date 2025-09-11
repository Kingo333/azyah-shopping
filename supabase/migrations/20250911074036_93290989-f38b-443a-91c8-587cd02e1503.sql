-- Create missing retailer records for existing retailer users
INSERT INTO public.retailers (
  owner_user_id,
  name,
  slug,
  contact_email,
  created_at,
  updated_at
)
SELECT 
  u.id,
  COALESCE(u.name, 'My Retailer Store'),
  LOWER(REPLACE(COALESCE(u.name, 'my-retailer-store-' || SUBSTRING(u.id::text, 1, 8)), ' ', '-')),
  u.email,
  NOW(),
  NOW()
FROM public.users u
WHERE u.role = 'retailer'
  AND NOT EXISTS (
    SELECT 1 FROM public.retailers r 
    WHERE r.owner_user_id = u.id
  );

-- Update RetailerPortal auto-creation and improve user setup flow