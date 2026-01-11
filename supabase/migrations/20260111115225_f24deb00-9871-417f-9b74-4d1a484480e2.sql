-- Create the plural function to get all deals for an outfit (up to 4)
CREATE OR REPLACE FUNCTION public.get_public_deals_for_outfit_slug(p_slug text)
RETURNS TABLE (
    promo_id uuid,
    promo_name text,
    affiliate_code text,
    affiliate_url text,
    expires_at timestamptz,
    days_left integer,
    owner_username text,
    owner_name text
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_outfit_id uuid;
    v_is_public boolean;
BEGIN
    SELECT f.id, f.is_public INTO v_outfit_id, v_is_public
    FROM public.fits f
    WHERE f.share_slug = p_slug;
    
    IF v_outfit_id IS NULL OR v_is_public IS NOT TRUE THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        ap.id AS promo_id,
        ap.promo_name,
        ap.affiliate_code,
        ap.affiliate_url,
        ap.expires_at,
        CASE WHEN ap.expires_at IS NULL THEN NULL
             ELSE GREATEST(0, EXTRACT(DAY FROM (ap.expires_at - now()))::integer)
        END AS days_left,
        u.username AS owner_username,
        u.name AS owner_name
    FROM public.affiliate_promo_outfits apo
    JOIN public.affiliate_promos ap ON ap.id = apo.promo_id
    JOIN public.users u ON u.id = ap.owner_user_id
    WHERE apo.outfit_id = v_outfit_id
      AND ap.is_active = true
      AND (ap.expires_at IS NULL OR ap.expires_at > now())
    LIMIT 4;
END;
$$;