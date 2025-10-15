-- Create wardrobe-items storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'wardrobe-items',
  'wardrobe-items',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can upload their own wardrobe items" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own wardrobe items" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own wardrobe items" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own wardrobe items" ON storage.objects;
DROP POLICY IF EXISTS "Public can view wardrobe items" ON storage.objects;

-- Create storage policies for wardrobe-items bucket
CREATE POLICY "Users can upload their own wardrobe items"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'wardrobe-items' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own wardrobe items"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'wardrobe-items' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Public can view wardrobe items"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'wardrobe-items');

CREATE POLICY "Users can update their own wardrobe items"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'wardrobe-items' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own wardrobe items"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'wardrobe-items' AND
  (storage.foldername(name))[1] = auth.uid()::text
);