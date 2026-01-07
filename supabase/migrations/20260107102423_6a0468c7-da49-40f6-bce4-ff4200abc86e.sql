-- ============================================
-- SLUG-ONLY SHARE SYSTEM: Fits & Wardrobe Items
-- ============================================

-- 1. Add share_slug column to fits table
ALTER TABLE public.fits ADD COLUMN IF NOT EXISTS share_slug TEXT;

-- 2. Create unique partial index for share_slug (only where NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS fits_share_slug_unique 
ON public.fits (share_slug) 
WHERE share_slug IS NOT NULL;

-- 3. Add share_slug column to wardrobe_items table
ALTER TABLE public.wardrobe_items ADD COLUMN IF NOT EXISTS share_slug TEXT;

-- 4. Create unique partial index for wardrobe_items share_slug
CREATE UNIQUE INDEX IF NOT EXISTS wardrobe_items_share_slug_unique 
ON public.wardrobe_items (share_slug) 
WHERE share_slug IS NOT NULL;

-- 5. Create helper function to generate URL-friendly slugs
CREATE OR REPLACE FUNCTION public.slugify(text_input TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LEFT(
    TRIM(BOTH '-' FROM 
      REGEXP_REPLACE(
        LOWER(COALESCE(text_input, '')), 
        '[^a-z0-9]+', 
        '-', 
        'g'
      )
    ),
    60
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 6. Function to generate unique outfit share_slug
CREATE OR REPLACE FUNCTION public.generate_outfit_share_slug()
RETURNS TRIGGER AS $$
DECLARE
  creator_name TEXT;
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 0;
BEGIN
  -- Only generate for public outfits without a slug
  IF NEW.is_public = true AND NEW.share_slug IS NULL THEN
    -- Get creator name from public_profiles
    SELECT COALESCE(pp.username, pp.name, 'azyah-user')
    INTO creator_name
    FROM public.public_profiles pp
    WHERE pp.id = NEW.user_id;
    
    -- If no profile found, use fallback
    IF creator_name IS NULL THEN
      creator_name := 'azyah-user';
    END IF;
    
    -- Build base slug: {creator}-closet-{title}
    base_slug := public.slugify(creator_name || '-closet-' || COALESCE(NULLIF(NEW.title, ''), 'outfit'));
    
    -- Ensure uniqueness by appending counter if needed
    final_slug := base_slug;
    WHILE EXISTS (SELECT 1 FROM public.fits WHERE share_slug = final_slug AND id != NEW.id) LOOP
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    
    NEW.share_slug := final_slug;
  END IF;
  
  -- Clear slug if outfit becomes private
  IF NEW.is_public = false AND OLD IS NOT NULL AND OLD.is_public = true THEN
    NEW.share_slug := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create trigger for auto-generating outfit slugs
DROP TRIGGER IF EXISTS trigger_generate_outfit_slug ON public.fits;
CREATE TRIGGER trigger_generate_outfit_slug
BEFORE INSERT OR UPDATE ON public.fits
FOR EACH ROW
EXECUTE FUNCTION public.generate_outfit_share_slug();

-- 8. Function to generate unique item share_slug
CREATE OR REPLACE FUNCTION public.generate_item_share_slug()
RETURNS TRIGGER AS $$
DECLARE
  creator_name TEXT;
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 0;
  is_shareable BOOLEAN;
BEGIN
  -- Check if this item should have a share_slug
  -- Item is shareable if: public_reuse_permitted = true OR belongs to a public outfit
  SELECT EXISTS (
    SELECT 1 FROM public.fit_items fi
    JOIN public.fits f ON f.id = fi.fit_id
    WHERE fi.wardrobe_item_id = NEW.id AND f.is_public = true
  ) OR COALESCE(NEW.public_reuse_permitted, false)
  INTO is_shareable;
  
  IF is_shareable AND NEW.share_slug IS NULL THEN
    -- Get creator name
    SELECT COALESCE(pp.username, pp.name, 'azyah-user')
    INTO creator_name
    FROM public.public_profiles pp
    WHERE pp.id = NEW.user_id;
    
    IF creator_name IS NULL THEN
      creator_name := 'azyah-user';
    END IF;
    
    -- Build base slug: {creator}-closet-{name/brand/category}
    base_slug := public.slugify(
      creator_name || '-closet-' || 
      COALESCE(NULLIF(NEW.name, ''), NULLIF(NEW.brand, ''), NEW.category, 'item')
    );
    
    -- Ensure uniqueness
    final_slug := base_slug;
    WHILE EXISTS (SELECT 1 FROM public.wardrobe_items WHERE share_slug = final_slug AND id != NEW.id) LOOP
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    
    NEW.share_slug := final_slug;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create trigger for auto-generating item slugs
DROP TRIGGER IF EXISTS trigger_generate_item_slug ON public.wardrobe_items;
CREATE TRIGGER trigger_generate_item_slug
BEFORE INSERT OR UPDATE ON public.wardrobe_items
FOR EACH ROW
EXECUTE FUNCTION public.generate_item_share_slug();

-- 10. Backfill existing public outfits with share_slug
WITH ranked_outfits AS (
  SELECT 
    f.id,
    f.title,
    f.user_id,
    COALESCE(pp.username, pp.name, 'azyah-user') as creator_name,
    ROW_NUMBER() OVER (
      PARTITION BY public.slugify(
        COALESCE(pp.username, pp.name, 'azyah-user') || '-closet-' || 
        COALESCE(NULLIF(f.title, ''), 'outfit')
      )
      ORDER BY f.created_at
    ) as slug_rank
  FROM public.fits f
  LEFT JOIN public.public_profiles pp ON pp.id = f.user_id
  WHERE f.is_public = true AND f.share_slug IS NULL
)
UPDATE public.fits 
SET share_slug = 
  CASE 
    WHEN ro.slug_rank = 1 THEN 
      public.slugify(ro.creator_name || '-closet-' || COALESCE(NULLIF(ro.title, ''), 'outfit'))
    ELSE 
      public.slugify(ro.creator_name || '-closet-' || COALESCE(NULLIF(ro.title, ''), 'outfit')) || '-' || ro.slug_rank
  END
FROM ranked_outfits ro
WHERE fits.id = ro.id;

-- 11. Backfill items in public outfits
WITH shareable_items AS (
  SELECT DISTINCT wi.id, wi.name, wi.brand, wi.category, wi.user_id,
    COALESCE(pp.username, pp.name, 'azyah-user') as creator_name,
    ROW_NUMBER() OVER (
      PARTITION BY public.slugify(
        COALESCE(pp.username, pp.name, 'azyah-user') || '-closet-' || 
        COALESCE(NULLIF(wi.name, ''), NULLIF(wi.brand, ''), wi.category, 'item')
      )
      ORDER BY wi.created_at
    ) as slug_rank
  FROM public.wardrobe_items wi
  LEFT JOIN public.public_profiles pp ON pp.id = wi.user_id
  WHERE wi.share_slug IS NULL
    AND (
      wi.public_reuse_permitted = true
      OR EXISTS (
        SELECT 1 FROM public.fit_items fi
        JOIN public.fits f ON f.id = fi.fit_id
        WHERE fi.wardrobe_item_id = wi.id AND f.is_public = true
      )
    )
)
UPDATE public.wardrobe_items 
SET share_slug = 
  CASE 
    WHEN si.slug_rank = 1 THEN 
      public.slugify(si.creator_name || '-closet-' || COALESCE(NULLIF(si.name, ''), NULLIF(si.brand, ''), si.category, 'item'))
    ELSE 
      public.slugify(si.creator_name || '-closet-' || COALESCE(NULLIF(si.name, ''), NULLIF(si.brand, ''), si.category, 'item')) || '-' || si.slug_rank
  END
FROM shareable_items si
WHERE wardrobe_items.id = si.id;

-- ============================================
-- RPC FUNCTIONS FOR SLUG-BASED LOOKUPS
-- ============================================

-- 12. Get public outfit by slug
CREATE OR REPLACE FUNCTION public.get_public_outfit_by_slug(slug_param TEXT)
RETURNS TABLE (
  id UUID,
  title TEXT,
  render_path TEXT,
  image_preview TEXT,
  like_count INT,
  comment_count INT,
  created_at TIMESTAMPTZ,
  share_slug TEXT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.title,
    f.render_path,
    f.image_preview,
    f.like_count,
    f.comment_count,
    f.created_at,
    f.share_slug
  FROM public.fits f
  WHERE f.share_slug = slug_param 
    AND f.is_public = true
  LIMIT 1;
END;
$$;

-- 13. Get creator info by outfit slug
CREATE OR REPLACE FUNCTION public.get_public_outfit_creator_by_slug(slug_param TEXT)
RETURNS TABLE (
  creator_id UUID,
  username TEXT,
  name TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pp.id as creator_id,
    pp.username,
    pp.name,
    pp.avatar_url
  FROM public.fits f
  JOIN public.public_profiles pp ON pp.id = f.user_id
  WHERE f.share_slug = slug_param 
    AND f.is_public = true
  LIMIT 1;
END;
$$;

-- 14. Get all items for a public outfit by slug
-- CRITICAL: Returns ALL items even if individual public_reuse_permitted is false
CREATE OR REPLACE FUNCTION public.get_public_outfit_items_by_slug(slug_param TEXT)
RETURNS TABLE (
  id UUID,
  share_slug TEXT,
  image_url TEXT,
  image_bg_removed_url TEXT,
  brand TEXT,
  category TEXT,
  name TEXT,
  source_url TEXT,
  source_vendor_name TEXT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  outfit_id_var UUID;
  is_outfit_public BOOLEAN;
BEGIN
  -- First verify the outfit exists and is public
  SELECT f.id, f.is_public INTO outfit_id_var, is_outfit_public
  FROM public.fits f
  WHERE f.share_slug = slug_param
  LIMIT 1;
  
  -- Only return items if outfit is public
  IF outfit_id_var IS NOT NULL AND is_outfit_public = true THEN
    RETURN QUERY
    SELECT 
      wi.id,
      wi.share_slug,
      wi.image_url,
      wi.image_bg_removed_url,
      wi.brand,
      wi.category,
      wi.name,
      wi.source_url,
      wi.source_vendor_name
    FROM public.fit_items fi
    JOIN public.wardrobe_items wi ON wi.id = fi.wardrobe_item_id
    WHERE fi.fit_id = outfit_id_var
    ORDER BY fi.z_index
    LIMIT 50;
  END IF;
END;
$$;

-- 15. Get public item by slug
CREATE OR REPLACE FUNCTION public.get_public_item_by_slug(slug_param TEXT)
RETURNS TABLE (
  id UUID,
  share_slug TEXT,
  image_url TEXT,
  image_bg_removed_url TEXT,
  brand TEXT,
  category TEXT,
  name TEXT,
  color TEXT,
  season TEXT,
  tags TEXT[],
  source_url TEXT,
  source_vendor_name TEXT,
  created_at TIMESTAMPTZ,
  creator_id UUID,
  creator_username TEXT,
  creator_name TEXT,
  creator_avatar_url TEXT,
  outfit_id UUID,
  outfit_title TEXT,
  outfit_slug TEXT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wi.id,
    wi.share_slug,
    wi.image_url,
    wi.image_bg_removed_url,
    wi.brand,
    wi.category,
    wi.name,
    wi.color,
    wi.season,
    wi.tags,
    wi.source_url,
    wi.source_vendor_name,
    wi.created_at,
    pp.id as creator_id,
    pp.username as creator_username,
    pp.name as creator_name,
    pp.avatar_url as creator_avatar_url,
    f.id as outfit_id,
    f.title as outfit_title,
    f.share_slug as outfit_slug
  FROM public.wardrobe_items wi
  LEFT JOIN public.public_profiles pp ON pp.id = wi.user_id
  LEFT JOIN public.fit_items fi ON fi.wardrobe_item_id = wi.id
  LEFT JOIN public.fits f ON f.id = fi.fit_id AND f.is_public = true
  WHERE wi.share_slug = slug_param
    AND (
      wi.public_reuse_permitted = true
      OR EXISTS (
        SELECT 1 FROM public.fit_items fi2
        JOIN public.fits f2 ON f2.id = fi2.fit_id
        WHERE fi2.wardrobe_item_id = wi.id AND f2.is_public = true
      )
    )
  LIMIT 1;
END;
$$;

-- 16. Get creator's other public outfits (for "More by creator")
CREATE OR REPLACE FUNCTION public.get_creator_public_outfits_by_slug(
  creator_id_param UUID,
  exclude_slug_param TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  render_path TEXT,
  image_preview TEXT,
  share_slug TEXT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.title,
    f.render_path,
    f.image_preview,
    f.share_slug
  FROM public.fits f
  WHERE f.user_id = creator_id_param
    AND f.is_public = true
    AND (exclude_slug_param IS NULL OR f.share_slug != exclude_slug_param)
  ORDER BY f.created_at DESC
  LIMIT 12;
END;
$$;