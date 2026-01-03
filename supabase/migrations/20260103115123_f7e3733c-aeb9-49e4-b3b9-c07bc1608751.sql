-- Create template table for default wardrobe items
CREATE TABLE IF NOT EXISTS public.default_wardrobe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  image_bg_removed_url TEXT,
  category TEXT NOT NULL,
  color TEXT,
  season TEXT,
  brand TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on new table
ALTER TABLE default_wardrobe_items ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users
CREATE POLICY "Authenticated users can view defaults" ON default_wardrobe_items
  FOR SELECT TO authenticated USING (true);

-- Populate template table from shopper@test.com's default items
INSERT INTO default_wardrobe_items (image_url, image_bg_removed_url, category, color, season, brand, tags)
SELECT image_url, image_bg_removed_url, category, color, season, brand, tags
FROM wardrobe_items
WHERE is_default = true
AND user_id = (SELECT id FROM auth.users WHERE email = 'shopper@test.com');

-- Create function to copy defaults to new user
CREATE OR REPLACE FUNCTION copy_default_wardrobe_items(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO wardrobe_items (
    user_id, image_url, image_bg_removed_url, category, 
    color, season, brand, tags, is_default, source
  )
  SELECT 
    target_user_id, image_url, image_bg_removed_url, category,
    color, season, brand, tags, true, 'upload'
  FROM default_wardrobe_items;
END;
$$;

-- Update handle_new_user trigger to copy defaults for shoppers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  detected_role text;
  detected_provider text;
BEGIN
  detected_role := COALESCE(NEW.raw_user_meta_data->>'role', 'shopper');
  detected_provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');
  
  -- Insert user record
  INSERT INTO public.users (id, email, role, provider, onboarding_completed, created_at, updated_at)
  VALUES (NEW.id, NEW.email, detected_role::user_role, detected_provider, false, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    provider = EXCLUDED.provider,
    updated_at = NOW();
  
  -- Copy default wardrobe items for shoppers
  IF detected_role = 'shopper' THEN
    PERFORM copy_default_wardrobe_items(NEW.id);
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user trigger: % %', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;