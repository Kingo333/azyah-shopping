-- Create retailer account for brand@test.com user and assign products
-- This fixes the data consistency issue where products belong to a brand but no retailer

-- 1. Create a retailer account for the brand@test.com user
INSERT INTO public.retailers (
  id,
  owner_user_id,
  name,
  slug,
  bio,
  contact_email,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'bfe3cd03-8f4d-417a-8730-032f1cb3fdc3', -- brand@test.com user ID
  'Alex Fashion Retailer',
  'alex-fashion-retailer',
  'Retail outlet for Alex Fashion Co products',
  'brand@test.com',
  now(),
  now()
);

-- 2. Get the newly created retailer ID and assign all brand products to it
WITH new_retailer AS (
  SELECT id as retailer_id 
  FROM public.retailers 
  WHERE owner_user_id = 'bfe3cd03-8f4d-417a-8730-032f1cb3fdc3'
  AND name = 'Alex Fashion Retailer'
)
UPDATE public.products 
SET retailer_id = new_retailer.retailer_id,
    updated_at = now()
FROM new_retailer
WHERE products.brand_id = '0c8329d1-89cd-4128-bae8-33512a189bb4'
  AND products.retailer_id IS NULL;