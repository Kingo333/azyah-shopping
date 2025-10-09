-- Add RLS policies for toy-replica-source storage bucket

-- Allow users to upload their own source images
CREATE POLICY "Users can upload their own toy replica sources"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'toy-replica-source' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow users to view their own source images
CREATE POLICY "Users can view their own toy replica sources"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'toy-replica-source' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow users to update their own source images
CREATE POLICY "Users can update their own toy replica sources"
ON storage.objects
FOR UPDATE
TO public
USING (
  bucket_id = 'toy-replica-source' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own source images
CREATE POLICY "Users can delete their own toy replica sources"
ON storage.objects
FOR DELETE
TO public
USING (
  bucket_id = 'toy-replica-source' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);