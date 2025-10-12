-- Phase 1: Create event-user-photos storage bucket and RLS policies

-- Create event-user-photos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-user-photos', 'event-user-photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: Users can upload their own photos
CREATE POLICY "Users can upload their own event photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event-user-photos'
  AND auth.role() = 'authenticated'
);

-- RLS: Users can read their own photos and service role can access all
CREATE POLICY "Users can read their own event photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'event-user-photos'
  AND (auth.uid()::text = (storage.foldername(name))[2] OR auth.role() = 'service_role')
);

-- RLS: Service role full access
CREATE POLICY "Service role full access to event photos"
ON storage.objects FOR ALL
USING (bucket_id = 'event-user-photos' AND auth.role() = 'service_role');