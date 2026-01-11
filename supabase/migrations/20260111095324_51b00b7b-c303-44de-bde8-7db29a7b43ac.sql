
-- Drop the existing function with old return type
DROP FUNCTION IF EXISTS public.get_my_outfits_with_promo_status();

-- Recreate with new return type supporting multiple promos
CREATE OR REPLACE FUNCTION public.get_my_outfits_with_promo_status()
RETURNS TABLE(
    outfit_id uuid,
    title text,
    share_slug text,
    image_preview text,
    is_public boolean,
    attached_promo_ids uuid[],
    attached_promo_names text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id AS outfit_id,
        COALESCE(f.title, f.name, 'Untitled') AS title,
        f.share_slug,
        COALESCE(f.render_path, f.image_preview) AS image_preview,
        COALESCE(f.is_public, false) AS is_public,
        ARRAY_AGG(apo.promo_id) FILTER (WHERE apo.promo_id IS NOT NULL) AS attached_promo_ids,
        ARRAY_AGG(ap.promo_name) FILTER (WHERE ap.promo_name IS NOT NULL) AS attached_promo_names
    FROM public.fits f
    LEFT JOIN public.affiliate_promo_outfits apo ON apo.outfit_id = f.id
    LEFT JOIN public.affiliate_promos ap ON ap.id = apo.promo_id
    WHERE f.user_id = auth.uid()
    GROUP BY f.id, f.title, f.name, f.share_slug, f.render_path, f.image_preview, f.is_public, f.created_at
    ORDER BY f.created_at DESC;
END;
$$;
