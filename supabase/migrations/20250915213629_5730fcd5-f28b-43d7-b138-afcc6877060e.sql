-- Phase 1: Secure Storage Access for toy replica results
-- Create private bucket and add proper RLS policies

-- Create the toy-replica-result bucket as private (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('toy-replica-result', 'toy-replica-result', false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET 
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own toy replica results" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own toy replica results" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own toy replica results" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own toy replica results" ON storage.objects;

-- Create RLS policies for toy replica result access
-- Users can only view their own toy replica result images
CREATE POLICY "Users can view their own toy replica results" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'toy-replica-result' 
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can upload their own toy replica results
CREATE POLICY "Users can upload their own toy replica results" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'toy-replica-result' 
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own toy replica results
CREATE POLICY "Users can update their own toy replica results" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'toy-replica-result' 
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own toy replica results
CREATE POLICY "Users can delete their own toy replica results" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'toy-replica-result' 
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);