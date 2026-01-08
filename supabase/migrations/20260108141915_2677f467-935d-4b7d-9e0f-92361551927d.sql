-- Drop existing function first (return type is changing)
DROP FUNCTION IF EXISTS public.get_public_outfit_items_by_slug(TEXT);

-- Recreate with product + brand info for item labeling
CREATE FUNCTION public.get_public_outfit_items_by_slug(slug_param TEXT)
RETURNS TABLE (
  id UUID,
  share_slug TEXT,
  image_url TEXT,
  image_bg_removed_url TEXT,
  brand TEXT,
  category TEXT,
  name TEXT,
  source_url TEXT,
  source_vendor_name TEXT,
  source_product_id UUID,
  product_title TEXT,
  brand_id UUID,
  brand_name TEXT,
  brand_logo_url TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  outfit_id_var UUID;
  is_outfit_public BOOLEAN;
BEGIN
  -- Get outfit info with strict public check
  SELECT f.id, f.is_public INTO outfit_id_var, is_outfit_public
  FROM public.fits f
  WHERE f.share_slug = slug_param AND f.is_public = true
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
      wi.source_vendor_name,
      wi.source_product_id,
      p.title AS product_title,
      p.brand_id,
      b.name AS brand_name,
      b.logo_url AS brand_logo_url
    FROM public.fit_items fi
    JOIN public.wardrobe_items wi ON wi.id = fi.wardrobe_item_id
    LEFT JOIN public.products p ON p.id = wi.source_product_id
    LEFT JOIN public.brands b ON b.id = p.brand_id
    WHERE fi.fit_id = outfit_id_var
    ORDER BY fi.z_index NULLS LAST, wi.created_at NULLS LAST
    LIMIT 50;
  END IF;
END;
$$;