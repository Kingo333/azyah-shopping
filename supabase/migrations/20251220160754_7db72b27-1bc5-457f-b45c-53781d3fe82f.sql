-- Add brand_id column to salons table to link salon profiles to brand accounts
ALTER TABLE salons ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE SET NULL;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_salons_brand_id ON salons(brand_id);

-- Create trigger function: When brand.category is set to 'salon', auto-create salon profile
CREATE OR REPLACE FUNCTION auto_create_salon_for_brand()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when category changes TO 'salon'
  IF NEW.category = 'salon' AND (OLD.category IS NULL OR OLD.category != 'salon') THEN
    INSERT INTO salons (name, slug, owner_user_id, brand_id, city)
    VALUES (NEW.name, NEW.slug, NEW.owner_user_id, NEW.id, 'dubai')
    ON CONFLICT (slug) DO UPDATE SET brand_id = NEW.id, owner_user_id = NEW.owner_user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_auto_create_salon_for_brand ON brands;
CREATE TRIGGER trigger_auto_create_salon_for_brand
  AFTER UPDATE ON brands
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_salon_for_brand();