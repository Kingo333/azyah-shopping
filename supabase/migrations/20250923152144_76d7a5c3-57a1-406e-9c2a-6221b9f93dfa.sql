-- Create event-photos storage bucket for person photos in events
INSERT INTO storage.buckets (id, name, public) 
VALUES ('event-photos', 'event-photos', true);

-- Create RLS policies for event-photos bucket
CREATE POLICY "Anyone can view event photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'event-photos');

CREATE POLICY "Authenticated users can upload event photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'event-photos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own event photos" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'event-photos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own event photos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'event-photos' 
  AND auth.role() = 'authenticated'
);