-- Add is_default field to closets table
ALTER TABLE public.closets ADD COLUMN is_default boolean DEFAULT false;

-- Create function to auto-create default closet for new users
CREATE OR REPLACE FUNCTION public.create_default_closet_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Create default closet for new user
  INSERT INTO public.closets (
    user_id,
    title,
    description,
    is_public,
    is_default
  ) VALUES (
    NEW.id,
    'My Wardrobe',
    'Your personal style collection',
    false,
    true
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-create default closet when user is created
CREATE TRIGGER create_default_closet_trigger
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_closet_for_user();

-- Create default closet for existing users who don't have one
INSERT INTO public.closets (user_id, title, description, is_public, is_default)
SELECT 
  u.id,
  'My Wardrobe',
  'Your personal style collection',
  false,
  true
FROM public.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.closets c 
  WHERE c.user_id = u.id AND c.is_default = true
);

-- Add template_type enum for outfit templates
CREATE TYPE outfit_template_type AS ENUM (
  'casual',
  'formal',
  'party',
  'work',
  'sporty',
  'evening',
  'weekend',
  'date_night'
);

-- Add template fields to looks table
ALTER TABLE public.looks ADD COLUMN template_type outfit_template_type;
ALTER TABLE public.looks ADD COLUMN is_template boolean DEFAULT false;