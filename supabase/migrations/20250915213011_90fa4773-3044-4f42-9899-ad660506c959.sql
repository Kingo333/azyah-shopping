-- Update existing toy_replicas result_url column to store relative paths instead of absolute URLs
-- This migration will convert existing absolute Supabase URLs to relative paths for better mobile compatibility

-- First, let's create a function to extract relative paths from absolute URLs
CREATE OR REPLACE FUNCTION extract_relative_path_from_url(url TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- If it's already a relative path, return as-is
  IF url IS NULL OR NOT url ~ '^https?://' THEN
    RETURN url;
  END IF;
  
  -- Extract the path after /storage/v1/object/public/bucket_name/
  IF url ~ 'supabase\.co/storage/v1/object/public/' THEN
    RETURN regexp_replace(url, '^.*?/storage/v1/object/public/[^/]+/', '');
  END IF;
  
  -- If it doesn't match the expected pattern, return the original URL
  RETURN url;
END;
$$;

-- Update existing toy_replicas to use relative paths for result_url
UPDATE toy_replicas 
SET result_url = extract_relative_path_from_url(result_url)
WHERE result_url IS NOT NULL 
  AND result_url ~ '^https?://.*supabase\.co/storage/v1/object/public/';

-- Clean up the temporary function
DROP FUNCTION IF EXISTS extract_relative_path_from_url(TEXT);

-- Add a comment to document the storage format
COMMENT ON COLUMN toy_replicas.result_url IS 'Stores relative path to result image (e.g., "results/user_id/replica_id_result.png") for environment-aware URL generation';