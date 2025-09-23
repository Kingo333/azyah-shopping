-- Fix search path for mark_product_as_event_only function
CREATE OR REPLACE FUNCTION public.mark_product_as_event_only()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark the product as event-only when it's added to an event
  UPDATE public.products 
  SET is_event_only = TRUE 
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;