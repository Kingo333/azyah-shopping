-- Create brand-logos storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('brand-logos', 'brand-logos', true);

-- Create RLS policies for brand-logos bucket
CREATE POLICY "Anyone can view brand logos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'brand-logos');

CREATE POLICY "Authenticated users can upload brand logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'brand-logos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own brand logos" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'brand-logos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own brand logos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'brand-logos' 
  AND auth.role() = 'authenticated'
);