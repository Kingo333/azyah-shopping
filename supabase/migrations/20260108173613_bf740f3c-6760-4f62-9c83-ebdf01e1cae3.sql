-- ===========================================
-- Affiliate Center: Outfit-Only Deals & Codes
-- ===========================================

-- Table: affiliate_promos
-- Stores promo offers that owners create once
CREATE TABLE IF NOT EXISTS public.affiliate_promos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    promo_name text,
    affiliate_code text,
    affiliate_url text,
    expires_at timestamptz,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table: affiliate_promo_outfits
-- Links promos to outfits (outfit-only, one promo per outfit enforced)
CREATE TABLE IF NOT EXISTS public.affiliate_promo_outfits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    promo_id uuid NOT NULL REFERENCES public.affiliate_promos(id) ON DELETE CASCADE,
    outfit_id uuid NOT NULL REFERENCES public.fits(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    -- Enforce ONE promo per outfit (prevents multiple codes on same outfit)
    CONSTRAINT unique_outfit_promo UNIQUE (outfit_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_affiliate_promos_owner ON public.affiliate_promos(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_promo_outfits_promo ON public.affiliate_promo_outfits(promo_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_promo_outfits_outfit ON public.affiliate_promo_outfits(outfit_id);

-- Enable RLS
ALTER TABLE public.affiliate_promos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_promo_outfits ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- RLS Policies for affiliate_promos
-- ===========================================

-- Owners can see their own promos
CREATE POLICY "Owners can view own promos"
ON public.affiliate_promos FOR SELECT
USING (auth.uid() = owner_user_id);

-- Owners can create promos
CREATE POLICY "Owners can create promos"
ON public.affiliate_promos FOR INSERT
WITH CHECK (auth.uid() = owner_user_id);

-- Owners can update their own promos
CREATE POLICY "Owners can update own promos"
ON public.affiliate_promos FOR UPDATE
USING (auth.uid() = owner_user_id);

-- Owners can delete their own promos
CREATE POLICY "Owners can delete own promos"
ON public.affiliate_promos FOR DELETE
USING (auth.uid() = owner_user_id);

-- ===========================================
-- RLS Policies for affiliate_promo_outfits
-- ===========================================

-- Owners can see their own promo attachments (via promo ownership)
CREATE POLICY "Owners can view own promo outfits"
ON public.affiliate_promo_outfits FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.affiliate_promos ap
        WHERE ap.id = promo_id AND ap.owner_user_id = auth.uid()
    )
);

-- Owners can attach promos to their outfits
CREATE POLICY "Owners can attach promos to outfits"
ON public.affiliate_promo_outfits FOR INSERT
WITH CHECK (
    -- Verify promo ownership
    EXISTS (
        SELECT 1 FROM public.affiliate_promos ap
        WHERE ap.id = promo_id AND ap.owner_user_id = auth.uid()
    )
    AND
    -- Verify outfit ownership
    EXISTS (
        SELECT 1 FROM public.fits f
        WHERE f.id = outfit_id AND f.user_id = auth.uid()
    )
);

-- Owners can detach promos
CREATE POLICY "Owners can detach promos from outfits"
ON public.affiliate_promo_outfits FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.affiliate_promos ap
        WHERE ap.id = promo_id AND ap.owner_user_id = auth.uid()
    )
);

-- ===========================================
-- SECURITY DEFINER RPCs for PUBLIC reads
-- ===========================================

-- RPC 1: get_public_deals_for_username
-- Returns active, non-expired promos for a user's public deals page
CREATE OR REPLACE FUNCTION public.get_public_deals_for_username(p_username text)
RETURNS TABLE (
    promo_id uuid,
    promo_name text,
    affiliate_code text,
    affiliate_url text,
    expires_at timestamptz,
    days_left integer,
    attached_outfits jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
BEGIN
    -- Resolve user by username
    SELECT u.id INTO v_user_id
    FROM public.users u
    WHERE u.username = p_username;
    
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        ap.id AS promo_id,
        ap.promo_name,
        ap.affiliate_code,
        ap.affiliate_url,
        ap.expires_at,
        CASE 
            WHEN ap.expires_at IS NULL THEN NULL
            ELSE GREATEST(0, EXTRACT(DAY FROM (ap.expires_at - now()))::integer)
        END AS days_left,
        COALESCE(
            (
                SELECT jsonb_agg(jsonb_build_object(
                    'outfit_id', f.id,
                    'title', COALESCE(f.title, 'Untitled'),
                    'share_slug', f.share_slug,
                    'image_preview', COALESCE(f.render_path, f.image_preview)
                ))
                FROM public.affiliate_promo_outfits apo
                JOIN public.fits f ON f.id = apo.outfit_id
                WHERE apo.promo_id = ap.id
                  AND f.is_public = true
            ),
            '[]'::jsonb
        ) AS attached_outfits
    FROM public.affiliate_promos ap
    WHERE ap.owner_user_id = v_user_id
      AND ap.is_active = true
      AND (ap.expires_at IS NULL OR ap.expires_at > now())
    ORDER BY ap.created_at DESC;
END;
$$;

-- RPC 2: get_public_deal_for_outfit_slug
-- Returns the deal for a specific outfit share page
CREATE OR REPLACE FUNCTION public.get_public_deal_for_outfit_slug(p_slug text)
RETURNS TABLE (
    promo_id uuid,
    promo_name text,
    affiliate_code text,
    affiliate_url text,
    expires_at timestamptz,
    days_left integer,
    owner_username text,
    owner_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_outfit_id uuid;
    v_is_public boolean;
BEGIN
    -- Resolve outfit by share_slug
    SELECT f.id, f.is_public INTO v_outfit_id, v_is_public
    FROM public.fits f
    WHERE f.share_slug = p_slug;
    
    -- Only return if outfit exists and is public
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
        CASE 
            WHEN ap.expires_at IS NULL THEN NULL
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
    LIMIT 1;
END;
$$;

-- RPC 3: get_my_promos_with_outfit_counts
-- Owner convenience RPC for listing promos with counts
CREATE OR REPLACE FUNCTION public.get_my_promos_with_outfit_counts()
RETURNS TABLE (
    promo_id uuid,
    promo_name text,
    affiliate_code text,
    affiliate_url text,
    expires_at timestamptz,
    is_active boolean,
    days_left integer,
    outfit_count bigint,
    created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ap.id AS promo_id,
        ap.promo_name,
        ap.affiliate_code,
        ap.affiliate_url,
        ap.expires_at,
        ap.is_active,
        CASE 
            WHEN ap.expires_at IS NULL THEN NULL
            ELSE GREATEST(0, EXTRACT(DAY FROM (ap.expires_at - now()))::integer)
        END AS days_left,
        (
            SELECT COUNT(*)
            FROM public.affiliate_promo_outfits apo
            JOIN public.fits f ON f.id = apo.outfit_id
            WHERE apo.promo_id = ap.id AND f.is_public = true
        ) AS outfit_count,
        ap.created_at
    FROM public.affiliate_promos ap
    WHERE ap.owner_user_id = auth.uid()
    ORDER BY ap.created_at DESC;
END;
$$;

-- RPC 4: get_outfit_promo_status
-- Returns which outfits have promos attached (for the attach modal)
CREATE OR REPLACE FUNCTION public.get_my_outfits_with_promo_status()
RETURNS TABLE (
    outfit_id uuid,
    title text,
    share_slug text,
    image_preview text,
    is_public boolean,
    attached_promo_id uuid,
    attached_promo_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id AS outfit_id,
        COALESCE(f.title, 'Untitled') AS title,
        f.share_slug,
        COALESCE(f.render_path, f.image_preview) AS image_preview,
        COALESCE(f.is_public, false) AS is_public,
        ap.id AS attached_promo_id,
        ap.promo_name AS attached_promo_name
    FROM public.fits f
    LEFT JOIN public.affiliate_promo_outfits apo ON apo.outfit_id = f.id
    LEFT JOIN public.affiliate_promos ap ON ap.id = apo.promo_id AND ap.owner_user_id = auth.uid()
    WHERE f.user_id = auth.uid()
    ORDER BY f.created_at DESC;
END;
$$;

-- Trigger to update updated_at on affiliate_promos
CREATE OR REPLACE FUNCTION public.update_affiliate_promos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_affiliate_promos_updated_at ON public.affiliate_promos;
CREATE TRIGGER update_affiliate_promos_updated_at
BEFORE UPDATE ON public.affiliate_promos
FOR EACH ROW
EXECUTE FUNCTION public.update_affiliate_promos_updated_at();