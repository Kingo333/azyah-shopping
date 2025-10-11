-- =============================================================================
-- COMPLETE TOY REPLICA BACKEND REBUILD (CLEAN REBUILD - OPTION A)
-- =============================================================================

-- Step 1: Drop all existing RLS policies for toy_replicas table
DROP POLICY IF EXISTS "Users can create their own toy replicas" ON toy_replicas;
DROP POLICY IF EXISTS "Users can view their own toy replicas" ON toy_replicas;
DROP POLICY IF EXISTS "Users can update their own toy replicas" ON toy_replicas;

-- Step 2: Drop all existing storage policies for toy-replica-source bucket
DROP POLICY IF EXISTS "Users can upload their own toy replica sources" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own toy replica sources" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own toy replica sources" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own toy replica sources" ON storage.objects;

-- Step 3: Drop all existing storage policies for toy-replica-result bucket
DROP POLICY IF EXISTS "Users can upload their own toy replica results" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own toy replica results" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own toy replica results" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own toy replica results" ON storage.objects;

-- Step 4: Drop the toy_replicas table (cascades to all dependent data)
DROP TABLE IF EXISTS toy_replicas CASCADE;

-- Step 5: Delete all files from storage buckets
DELETE FROM storage.objects WHERE bucket_id = 'toy-replica-source';
DELETE FROM storage.objects WHERE bucket_id = 'toy-replica-result';

-- Step 6: Remove storage buckets
DELETE FROM storage.buckets WHERE id = 'toy-replica-source';
DELETE FROM storage.buckets WHERE id = 'toy-replica-result';

-- Step 7: Create new toy_replicas table with enhanced schema
CREATE TABLE public.toy_replicas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_url text NOT NULL,
  result_url text,
  status text NOT NULL DEFAULT 'queued' 
    CHECK (status IN ('queued', 'processing', 'succeeded', 'failed')),
  error text,
  retry_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Step 8: Add performance indexes
CREATE INDEX idx_toy_replicas_user_status ON toy_replicas(user_id, status);
CREATE INDEX idx_toy_replicas_created ON toy_replicas(created_at DESC);

-- Step 9: Enable Row Level Security
ALTER TABLE toy_replicas ENABLE ROW LEVEL SECURITY;

-- Step 10: Add RLS policies for toy_replicas table
CREATE POLICY "Users can create their own toy replicas"
ON toy_replicas FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own toy replicas"
ON toy_replicas FOR SELECT
TO public
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own toy replicas"
ON toy_replicas FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own toy replicas"
ON toy_replicas FOR DELETE
TO public
USING (auth.uid() = user_id);

-- Step 11: Create source storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'toy-replica-source',
  'toy-replica-source',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Step 12: Create result storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'toy-replica-result',
  'toy-replica-result',
  false,
  10485760,
  ARRAY['image/png']
);

-- Step 13: Add RLS policies for toy-replica-source bucket
CREATE POLICY "Users can upload their own toy replica sources"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'toy-replica-source' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own toy replica sources"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'toy-replica-source'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own toy replica sources"
ON storage.objects FOR UPDATE
TO public
USING (
  bucket_id = 'toy-replica-source'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own toy replica sources"
ON storage.objects FOR DELETE
TO public
USING (
  bucket_id = 'toy-replica-source'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Step 14: Add RLS policies for toy-replica-result bucket
CREATE POLICY "Users can upload their own toy replica results"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'toy-replica-result'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own toy replica results"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'toy-replica-result'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own toy replica results"
ON storage.objects FOR UPDATE
TO public
USING (
  bucket_id = 'toy-replica-result'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own toy replica results"
ON storage.objects FOR DELETE
TO public
USING (
  bucket_id = 'toy-replica-result'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Step 15: Add automatic timestamp trigger
CREATE OR REPLACE FUNCTION update_toy_replicas_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_toy_replicas_updated_at
  BEFORE UPDATE ON toy_replicas
  FOR EACH ROW
  EXECUTE FUNCTION update_toy_replicas_timestamp();