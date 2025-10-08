-- Make wardrobe bucket public so images can be displayed
UPDATE storage.buckets 
SET public = true 
WHERE id = 'wardrobe';

-- Create RLS policies for wardrobe bucket
-- Allow authenticated users to upload their own files
CREATE POLICY "Users can upload their own wardrobe items"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'wardrobe' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to read their own files
CREATE POLICY "Users can read their own wardrobe items"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'wardrobe' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own files
CREATE POLICY "Users can update their own wardrobe items"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'wardrobe' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own wardrobe items"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'wardrobe' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);