-- Drop the old constraint that blocks multiple promos per outfit
ALTER TABLE public.affiliate_promo_outfits 
DROP CONSTRAINT IF EXISTS unique_outfit_promo;

-- Add constraint to prevent same promo attached twice to same outfit
ALTER TABLE public.affiliate_promo_outfits
ADD CONSTRAINT unique_promo_outfit_pair UNIQUE (promo_id, outfit_id);

-- Create trigger function to enforce max 4 promos per outfit
CREATE OR REPLACE FUNCTION public.check_max_promos_per_outfit()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM public.affiliate_promo_outfits WHERE outfit_id = NEW.outfit_id) >= 4 THEN
        RAISE EXCEPTION 'Maximum 4 promo codes per outfit allowed';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS enforce_max_promos_per_outfit ON public.affiliate_promo_outfits;
CREATE TRIGGER enforce_max_promos_per_outfit
BEFORE INSERT ON public.affiliate_promo_outfits
FOR EACH ROW EXECUTE FUNCTION public.check_max_promos_per_outfit();