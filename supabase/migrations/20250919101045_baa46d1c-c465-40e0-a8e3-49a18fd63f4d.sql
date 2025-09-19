-- Create storage bucket for safety documents
INSERT INTO storage.buckets (id, name, public) VALUES ('safety-documents', 'safety-documents', false);

-- Create policies for safety documents bucket
CREATE POLICY "Users can view their own safety documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'safety-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own safety documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'safety-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own safety documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'safety-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own safety documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'safety-documents' AND auth.uid()::text = (storage.foldername(name))[1]);