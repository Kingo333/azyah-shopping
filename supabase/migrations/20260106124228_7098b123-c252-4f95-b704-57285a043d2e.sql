-- ============================================
-- PUBLIC SHARE RPC FUNCTIONS WITH STRICT GUARDRAILS
-- ============================================

-- 1) Get wardrobe items for a PUBLIC outfit (bypasses RLS)
-- Returns ONLY minimal columns needed for display, NO user_id or internal flags
CREATE OR REPLACE FUNCTION public.get_public_outfit_items(outfit_id uuid)
RETURNS TABLE (
  id uuid,
  image_url text,
  image_bg_removed_url text,
  brand text,
  category text,
  source_url text,
  source_vendor_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    wi.id,
    wi.image_url,
    wi.image_bg_removed_url,
    wi.brand,
    wi.category,
    wi.source_url,
    wi.source_vendor_name
  FROM fit_items fi
  JOIN fits f ON f.id = fi.fit_id
  JOIN wardrobe_items wi ON wi.id = fi.wardrobe_item_id
  WHERE fi.fit_id = outfit_id
    AND f.is_public = true  -- CRITICAL: Only for public outfits
  LIMIT 50;  -- Guardrail: max items per outfit
$$;

-- 2) Get creator info for a PUBLIC outfit
-- Returns ONLY public profile fields needed for display
CREATE OR REPLACE FUNCTION public.get_public_outfit_creator(outfit_id uuid)
RETURNS TABLE (
  username text,
  name text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    pp.username,
    pp.name,
    pp.avatar_url
  FROM fits f
  JOIN public_profiles pp ON pp.id = f.user_id
  WHERE f.id = outfit_id
    AND f.is_public = true  -- CRITICAL: Only for public outfits
  LIMIT 1;
$$;

-- 3) Get a PUBLIC item with proper creator attribution
-- Attribution logic:
--   1. If item is in a public outfit, use the MOST RECENT public outfit creator
--   2. Else if public_reuse_permitted, use attribution_user_id or owner
-- Returns ONLY minimal columns needed for display
CREATE OR REPLACE FUNCTION public.get_public_item_with_creator(item_id uuid)
RETURNS TABLE (
  id uuid,
  image_url text,
  image_bg_removed_url text,
  brand text,
  category text,
  color text,
  season text,
  tags text[],
  source_url text,
  source_vendor_name text,
  created_at timestamptz,
  creator_id uuid,
  creator_username text,
  creator_name text,
  creator_avatar_url text,
  outfit_id uuid,
  outfit_title text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item wardrobe_items%ROWTYPE;
  v_public_outfit RECORD;
  v_creator RECORD;
BEGIN
  -- 1. Fetch the item
  SELECT * INTO v_item FROM wardrobe_items wi WHERE wi.id = item_id;
  
  IF v_item IS NULL THEN
    RETURN;
  END IF;
  
  -- 2. Try to find the most recent public outfit containing this item
  SELECT f.id AS fit_id, f.title, f.user_id, f.created_at
  INTO v_public_outfit
  FROM fit_items fi
  JOIN fits f ON f.id = fi.fit_id
  WHERE fi.wardrobe_item_id = item_id
    AND f.is_public = true
  ORDER BY f.created_at DESC
  LIMIT 1;
  
  -- 3. Determine access and creator
  IF v_public_outfit IS NOT NULL THEN
    -- Item is in a public outfit - use outfit creator
    SELECT pp.id, pp.username, pp.name, pp.avatar_url
    INTO v_creator
    FROM public_profiles pp
    WHERE pp.id = v_public_outfit.user_id;
    
    RETURN QUERY SELECT
      v_item.id,
      v_item.image_url,
      v_item.image_bg_removed_url,
      v_item.brand,
      v_item.category,
      v_item.color,
      v_item.season::text,
      v_item.tags,
      v_item.source_url,
      v_item.source_vendor_name,
      v_item.created_at,
      v_creator.id,
      v_creator.username,
      v_creator.name,
      v_creator.avatar_url,
      v_public_outfit.fit_id,
      v_public_outfit.title;
      
  ELSIF v_item.public_reuse_permitted = true THEN
    -- Item is explicitly public - use attribution_user_id or owner
    SELECT pp.id, pp.username, pp.name, pp.avatar_url
    INTO v_creator
    FROM public_profiles pp
    WHERE pp.id = COALESCE(v_item.attribution_user_id, v_item.user_id);
    
    RETURN QUERY SELECT
      v_item.id,
      v_item.image_url,
      v_item.image_bg_removed_url,
      v_item.brand,
      v_item.category,
      v_item.color,
      v_item.season::text,
      v_item.tags,
      v_item.source_url,
      v_item.source_vendor_name,
      v_item.created_at,
      v_creator.id,
      v_creator.username,
      v_creator.name,
      v_creator.avatar_url,
      NULL::uuid,
      NULL::text;
  END IF;
  
  -- If neither public outfit nor public_reuse_permitted, return nothing (private)
  RETURN;
END;
$$;

-- 4) Get other public outfits by a creator (for "More by X" section)
CREATE OR REPLACE FUNCTION public.get_creator_public_outfits(
  creator_id uuid,
  exclude_outfit_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  render_path text,
  image_preview text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    f.id,
    f.title,
    f.render_path,
    f.image_preview,
    f.created_at
  FROM fits f
  WHERE f.user_id = creator_id
    AND f.is_public = true
    AND (exclude_outfit_id IS NULL OR f.id != exclude_outfit_id)
  ORDER BY f.created_at DESC
  LIMIT 12;  -- Guardrail: max outfits for carousel
$$;