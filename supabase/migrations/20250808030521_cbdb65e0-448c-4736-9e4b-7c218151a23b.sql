
-- Create storage buckets for product images and size charts
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('product-images', 'product-images', true, 8388608, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif']),
  ('size-charts', 'size-charts', true, 8388608, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif']);

-- Create RLS policies for product images bucket
CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own product images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create RLS policies for size charts bucket
CREATE POLICY "Anyone can view size charts"
ON storage.objects FOR SELECT
USING (bucket_id = 'size-charts');

CREATE POLICY "Authenticated users can upload size charts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'size-charts' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own size charts"
ON storage.objects FOR UPDATE
USING (bucket_id = 'size-charts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own size charts"
ON storage.objects FOR DELETE
USING (bucket_id = 'size-charts' AND auth.uid()::text = (storage.foldername(name))[1]);
