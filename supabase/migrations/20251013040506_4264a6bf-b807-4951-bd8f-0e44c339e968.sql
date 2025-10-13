-- Create event-tryon-results storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-tryon-results', 'event-tryon-results', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for event-tryon-results bucket
CREATE POLICY "Users can read own results"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'event-tryon-results' AND
  (storage.foldername(name))[1] IN (
    SELECT event_id::text FROM event_tryon_jobs WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Service role can write results"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event-tryon-results' AND
  auth.role() = 'service_role'
);

CREATE POLICY "Service role can update results"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'event-tryon-results' AND
  auth.role() = 'service_role'
);

CREATE POLICY "Users can delete own results"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'event-tryon-results' AND
  (storage.foldername(name))[1] IN (
    SELECT event_id::text FROM event_tryon_jobs WHERE user_id = auth.uid()
  )
);