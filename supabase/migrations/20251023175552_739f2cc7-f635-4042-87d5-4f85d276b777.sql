-- Enable RLS policies for saved-outfits storage bucket

-- Allow authenticated users to upload outfit images to their own folder
CREATE POLICY "Users can upload outfit images to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'saved-outfits' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public access to view all outfit images
CREATE POLICY "Public can view outfit images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'saved-outfits');

-- Allow authenticated users to delete their own outfit images
CREATE POLICY "Users can delete own outfit images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'saved-outfits'
  AND (storage.foldername(name))[1] = auth.uid()::text
);