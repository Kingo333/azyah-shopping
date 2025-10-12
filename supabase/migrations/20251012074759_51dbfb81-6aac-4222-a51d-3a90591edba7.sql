-- Fix storage policies for Toy Replica feature

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Users can upload result images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view result images" ON storage.objects;

-- Service role can upload to toy-replica-result bucket
CREATE POLICY "Service role can upload toy replica results"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (
  bucket_id = 'toy-replica-result' 
  AND name LIKE 'results/%'
);

-- Users can view their own toy replica results (or all results if you want public)
CREATE POLICY "Users can view toy replica results"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'toy-replica-result'
  -- Uncomment next line to restrict to user's own results only:
  -- AND (auth.uid())::text = (string_to_array(name, '/'))[2]
);

-- Users can upload to source bucket (their own folder only)
CREATE POLICY "Users can upload source images to own folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'toy-replica-source'
  AND (auth.uid())::text = (string_to_array(name, '/'))[1]
);

-- Users can view their own source images
CREATE POLICY "Users can view own source images"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'toy-replica-source'
  AND (auth.uid())::text = (string_to_array(name, '/'))[1]
);