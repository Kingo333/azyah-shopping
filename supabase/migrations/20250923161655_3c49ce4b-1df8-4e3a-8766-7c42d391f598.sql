-- Create a proper brand entry for "Abayacult"
INSERT INTO public.brands (
  name,
  slug,
  logo_url,
  owner_user_id,
  created_at,
  updated_at
) VALUES (
  'Abayacult',
  'abayacult',
  'https://klwolsopucgswhtdlsps.supabase.co/storage/v1/object/public/brand-logos/brand-logos/brand-logo-1758642371594.jpg',
  '768c1f7a-b99e-4c58-b6bd-1f9aec7da813',
  now(),
  now()
)
RETURNING id;

-- Update the event_brands entry to reference the new brand_id
UPDATE public.event_brands 
SET brand_id = (
  SELECT id FROM public.brands 
  WHERE name = 'Abayacult' 
  AND owner_user_id = '768c1f7a-b99e-4c58-b6bd-1f9aec7da813'
)
WHERE brand_name = 'Abayacult' AND brand_id IS NULL;