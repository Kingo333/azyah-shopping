-- Create storage bucket for person images if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tryon-persons', 'tryon-persons', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policy for tryon-persons bucket
CREATE POLICY "Users can upload their own person images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'tryon-persons' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own person images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'tryon-persons' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Service role can manage tryon-persons" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'tryon-persons' AND auth.role() = 'service_role');

-- Update ai_tryon_jobs table to use outfit_image_id instead of outfit_image_url
-- The table already has outfit_image_id column, so we just need to make sure it's being used correctly