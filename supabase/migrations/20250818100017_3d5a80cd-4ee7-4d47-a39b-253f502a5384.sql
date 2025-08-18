-- Create brand record for the user if it doesn't exist
INSERT INTO brands (
  name, 
  slug, 
  owner_user_id,
  bio,
  contact_email,
  created_at,
  updated_at
) 
SELECT 
  'Alex Brand',
  'alex-brand',
  'bfe3cd03-8f4d-417a-8730-032f1cb3fdc3',
  'Fashion brand focused on modern styles',
  'brand@test.com',
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM brands WHERE owner_user_id = 'bfe3cd03-8f4d-417a-8730-032f1cb3fdc3'
);