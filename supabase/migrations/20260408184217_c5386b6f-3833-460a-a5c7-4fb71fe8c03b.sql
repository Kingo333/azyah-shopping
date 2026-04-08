-- Add ar_preferred_mode column
ALTER TABLE public.event_brand_products 
ADD COLUMN IF NOT EXISTS ar_preferred_mode TEXT DEFAULT 'auto' 
CHECK (ar_preferred_mode IN ('auto', '2d', '3d'));

-- Tighten storage write policy: drop old broad policy, add path-enforced one
DROP POLICY IF EXISTS "Authenticated users can upload AR overlays" ON storage.objects;

CREATE POLICY "Brand owners can upload AR overlays"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event-ar-overlays' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] IS NOT NULL
);