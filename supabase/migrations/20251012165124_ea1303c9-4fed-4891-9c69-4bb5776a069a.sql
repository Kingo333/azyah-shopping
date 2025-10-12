-- Add storage policies for event-tryon-renders bucket

-- Allow service role to upload (used by edge function)
CREATE POLICY "Service role can upload event tryon renders"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'event-tryon-renders');

-- Allow users to view their own event tryon renders
-- Path structure: {event_id}/{user_id}/{filename}
CREATE POLICY "Users can view their own event tryon renders"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'event-tryon-renders' 
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow service role to delete old renders
CREATE POLICY "Service role can delete event tryon renders"
ON storage.objects
FOR DELETE
TO service_role
USING (bucket_id = 'event-tryon-renders');