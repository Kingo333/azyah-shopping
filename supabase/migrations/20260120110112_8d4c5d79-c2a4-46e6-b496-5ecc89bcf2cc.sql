-- Create the ai-tryon-uploads bucket (client uploads)
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-tryon-uploads', 'ai-tryon-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Create the ai-tryon-results bucket (edge function stores try-on images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-tryon-results', 'ai-tryon-results', true)
ON CONFLICT (id) DO NOTHING;

-- Create the ai-tryon-videos bucket (edge function stores videos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-tryon-videos', 'ai-tryon-videos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for ai-tryon-uploads
CREATE POLICY "Anyone can view ai-tryon-uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'ai-tryon-uploads');

CREATE POLICY "Authenticated users can upload to ai-tryon-uploads"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ai-tryon-uploads' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own ai-tryon-uploads"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'ai-tryon-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own ai-tryon-uploads"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ai-tryon-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policies for ai-tryon-results (edge functions write here)
CREATE POLICY "Anyone can view ai-tryon-results"
ON storage.objects FOR SELECT
USING (bucket_id = 'ai-tryon-results');

CREATE POLICY "Allow insert to ai-tryon-results"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ai-tryon-results');

CREATE POLICY "Allow update to ai-tryon-results"
ON storage.objects FOR UPDATE
USING (bucket_id = 'ai-tryon-results');

-- RLS Policies for ai-tryon-videos (edge functions write here)
CREATE POLICY "Anyone can view ai-tryon-videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'ai-tryon-videos');

CREATE POLICY "Allow insert to ai-tryon-videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ai-tryon-videos');

CREATE POLICY "Allow update to ai-tryon-videos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'ai-tryon-videos');