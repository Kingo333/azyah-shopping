-- Fix image_cache table security policies
-- Remove public access to internal image optimization data
DROP POLICY IF EXISTS "Image cache is publicly readable" ON public.image_cache;
DROP POLICY IF EXISTS "Service can manage image cache" ON public.image_cache;

-- Restrict access to authenticated users only for reading cache data
CREATE POLICY "Authenticated users can read image cache" 
ON public.image_cache 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

-- Service role maintains full management access for system operations
CREATE POLICY "Service role can manage image cache" 
ON public.image_cache 
FOR ALL 
USING (auth.role() = 'service_role'::text);