-- Phase 1: Secure Storage Access for toy replica results
-- Make toy-replica-result bucket private and add proper RLS policies

-- Update the toy-replica-result bucket to be private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'toy-replica-result';

-- Create RLS policies for toy replica result access
-- Users can only view their own toy replica result images
CREATE POLICY "Users can view their own toy replica results" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'toy-replica-result' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can upload their own toy replica results
CREATE POLICY "Users can upload their own toy replica results" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'toy-replica-result' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own toy replica results
CREATE POLICY "Users can update their own toy replica results" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'toy-replica-result' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own toy replica results
CREATE POLICY "Users can delete their own toy replica results" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'toy-replica-result' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add comment to document the security change
COMMENT ON TABLE storage.objects IS 'Storage objects with RLS policies - toy-replica-result bucket now private with user-specific access only';