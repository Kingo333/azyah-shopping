
-- Add ar_overlay_url column to event_brand_products
ALTER TABLE public.event_brand_products
ADD COLUMN IF NOT EXISTS ar_overlay_url TEXT;

-- Create storage bucket for 2D garment overlay images
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-ar-overlays', 'event-ar-overlays', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Public read access for AR overlays"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-ar-overlays');

-- Authenticated upload
CREATE POLICY "Authenticated users can upload AR overlays"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'event-ar-overlays' AND auth.role() = 'authenticated');

-- Authenticated update
CREATE POLICY "Authenticated users can update AR overlays"
ON storage.objects FOR UPDATE
USING (bucket_id = 'event-ar-overlays' AND auth.role() = 'authenticated');

-- Authenticated delete
CREATE POLICY "Authenticated users can delete AR overlays"
ON storage.objects FOR DELETE
USING (bucket_id = 'event-ar-overlays' AND auth.role() = 'authenticated');
