-- Create storage bucket for optimized images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('optimized-images', 'optimized-images', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- Create RLS policies for the bucket
CREATE POLICY "Optimized images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'optimized-images');

CREATE POLICY "Service can upload optimized images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'optimized-images');

CREATE POLICY "Service can update optimized images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'optimized-images');

-- Create table to track image optimizations
CREATE TABLE public.image_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_url TEXT NOT NULL UNIQUE,
  optimized_url TEXT NOT NULL,
  file_size INTEGER,
  dimensions JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on image_cache table
ALTER TABLE public.image_cache ENABLE ROW LEVEL SECURITY;

-- Create policies for image_cache
CREATE POLICY "Image cache is publicly readable"
ON public.image_cache
FOR SELECT
USING (true);

CREATE POLICY "Service can manage image cache"
ON public.image_cache
FOR ALL
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_image_cache_original_url ON public.image_cache(original_url);

-- Create function to update timestamps
CREATE TRIGGER update_image_cache_updated_at
BEFORE UPDATE ON public.image_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();