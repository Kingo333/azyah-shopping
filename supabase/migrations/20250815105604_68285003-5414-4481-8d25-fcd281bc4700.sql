
-- Create the missing storage buckets for toy replica functionality
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('toy-replica-source', 'toy-replica-source', false, 10485760, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
  ('toy-replica-result', 'toy-replica-result', true, 10485760, ARRAY['image/png']);

-- Create RLS policies for toy-replica-source bucket (private)
CREATE POLICY "Users can upload their own toy replica sources" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'toy-replica-source' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own toy replica sources" ON storage.objects
FOR SELECT USING (
  bucket_id = 'toy-replica-source' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own toy replica sources" ON storage.objects
FOR DELETE USING (
  bucket_id = 'toy-replica-source' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create RLS policies for toy-replica-result bucket (public)
CREATE POLICY "Anyone can view toy replica results" ON storage.objects
FOR SELECT USING (bucket_id = 'toy-replica-result');

CREATE POLICY "Service can insert toy replica results" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'toy-replica-result');

CREATE POLICY "Service can update toy replica results" ON storage.objects
FOR UPDATE USING (bucket_id = 'toy-replica-result');

CREATE POLICY "Users can delete their own toy replica results" ON storage.objects
FOR DELETE USING (
  bucket_id = 'toy-replica-result' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
