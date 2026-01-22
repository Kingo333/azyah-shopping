-- Create bucket for video input images (provider-safe copies)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tnb-video-inputs',
  'tnb-video-inputs', 
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Anyone can view video inputs"
ON storage.objects FOR SELECT
USING (bucket_id = 'tnb-video-inputs');

-- Service role can upload video inputs
CREATE POLICY "Service role can upload video inputs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'tnb-video-inputs');

-- Service role can delete video inputs
CREATE POLICY "Service role can delete video inputs"
ON storage.objects FOR DELETE
USING (bucket_id = 'tnb-video-inputs');