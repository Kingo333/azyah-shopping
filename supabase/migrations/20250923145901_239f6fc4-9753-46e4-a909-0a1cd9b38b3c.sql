-- Create storage bucket for event covers
INSERT INTO storage.buckets (id, name, public) 
VALUES ('event-covers', 'event-covers', true);

-- Create RLS policies for event cover uploads
CREATE POLICY "Event covers are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'event-covers');

CREATE POLICY "Authenticated users can upload event covers" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'event-covers' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own event covers" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'event-covers' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own event covers" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'event-covers' AND auth.uid() IS NOT NULL);