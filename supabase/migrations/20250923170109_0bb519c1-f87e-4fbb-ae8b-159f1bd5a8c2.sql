-- Fix security warnings by adding proper search_path to functions
CREATE OR REPLACE FUNCTION public.check_event_brand_limit()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM event_brands WHERE event_id = NEW.event_id) >= 10 THEN
    RAISE EXCEPTION 'Maximum 10 brands allowed per event';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_brand_product_limit()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM event_brand_products WHERE event_brand_id = NEW.event_brand_id) >= 5 THEN
    RAISE EXCEPTION 'Maximum 5 products allowed per brand';
  END IF;
  RETURN NEW;
END;
$$;