-- Drop old duplicate storage policies for saved-outfits bucket
DROP POLICY IF EXISTS "Users can upload their own outfit images" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to outfit images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own outfit images" ON storage.objects;