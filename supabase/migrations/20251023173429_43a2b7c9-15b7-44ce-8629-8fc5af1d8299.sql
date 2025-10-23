-- Create storage bucket for saved outfit images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'saved-outfits',
  'saved-outfits',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg']
);

-- RLS Policy: Users can upload to their own folder
CREATE POLICY "Users can upload their own outfit images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'saved-outfits' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policy: Public read access
CREATE POLICY "Public read access to outfit images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'saved-outfits');

-- RLS Policy: Users can delete their own outfit images
CREATE POLICY "Users can delete their own outfit images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'saved-outfits' AND
  auth.uid()::text = (storage.foldername(name))[1]
);