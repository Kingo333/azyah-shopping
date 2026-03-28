
-- Add AR columns to event_brand_products
ALTER TABLE public.event_brand_products ADD COLUMN IF NOT EXISTS ar_model_url TEXT;
ALTER TABLE public.event_brand_products ADD COLUMN IF NOT EXISTS ar_model_format TEXT DEFAULT 'glb';
ALTER TABLE public.event_brand_products ADD COLUMN IF NOT EXISTS ar_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.event_brand_products ADD COLUMN IF NOT EXISTS ar_scale FLOAT DEFAULT 1.0;
ALTER TABLE public.event_brand_products ADD COLUMN IF NOT EXISTS ar_position_offset JSONB DEFAULT '{"x":0,"y":0,"z":0}';

-- Create event-ar-models storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-ar-models', 'event-ar-models', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: Anyone can read AR models (public bucket)
CREATE POLICY "Public read access for AR models"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'event-ar-models');

-- RLS: Authenticated users can upload AR models
CREATE POLICY "Authenticated users can upload AR models"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-ar-models');

-- RLS: Authenticated users can update their AR models
CREATE POLICY "Authenticated users can update AR models"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'event-ar-models');

-- RLS: Authenticated users can delete AR models
CREATE POLICY "Authenticated users can delete AR models"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'event-ar-models');
