-- Remove bucket configuration and keep only RLS policies for toy-replica-result access control

-- Create RLS policies for toy-replica-result bucket
CREATE POLICY "Users can view their own toy replica results" ON storage.objects
FOR SELECT USING (
  bucket_id = 'toy-replica-result' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own toy replica results" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'toy-replica-result' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own toy replica results" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'toy-replica-result' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own toy replica results" ON storage.objects
FOR DELETE USING (
  bucket_id = 'toy-replica-result' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);