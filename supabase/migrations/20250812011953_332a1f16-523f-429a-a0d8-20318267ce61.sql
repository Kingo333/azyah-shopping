-- Create a public bucket for visual search uploads
insert into storage.buckets (id, name, public)
values ('search-images', 'search-images', true)
on conflict (id) do nothing;

-- Public read access policy (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read for search-images'
  ) THEN
    CREATE POLICY "Public read for search-images"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'search-images');
  END IF;
END $$;

-- Users can upload their own images (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can upload their own search images'
  ) THEN
    CREATE POLICY "Users can upload their own search images"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'search-images'
        AND auth.role() = 'authenticated'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;

-- Users can update their own images (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can update their own search images'
  ) THEN
    CREATE POLICY "Users can update their own search images"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'search-images'
        AND auth.role() = 'authenticated'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;

-- Users can delete their own images (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can delete their own search images'
  ) THEN
    CREATE POLICY "Users can delete their own search images"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'search-images'
        AND auth.role() = 'authenticated'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;