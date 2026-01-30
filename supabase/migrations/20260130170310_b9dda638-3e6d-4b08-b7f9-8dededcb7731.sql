-- Create deals-uploads storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('deals-uploads', 'deals-uploads', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- RLS policy: authenticated users can upload to their own folder
CREATE POLICY "Users can upload to deals-uploads"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'deals-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS policy: users can read their own uploads via signed URL
CREATE POLICY "Users can read own deals-uploads"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'deals-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS policy: users can delete their own uploads
CREATE POLICY "Users can delete own deals-uploads"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'deals-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);