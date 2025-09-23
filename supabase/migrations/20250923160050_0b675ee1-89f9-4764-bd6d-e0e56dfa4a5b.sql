-- Add event context tracking to products table
ALTER TABLE public.products 
ADD COLUMN is_event_only BOOLEAN DEFAULT FALSE;

-- Update existing event products to be marked as event-only
UPDATE public.products 
SET is_event_only = TRUE 
WHERE id IN (
  SELECT DISTINCT product_id 
  FROM public.event_products
);

-- Create trigger to automatically mark products as event-only when added to events
CREATE OR REPLACE FUNCTION public.mark_product_as_event_only()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark the product as event-only when it's added to an event
  UPDATE public.products 
  SET is_event_only = TRUE 
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on event_products table
DROP TRIGGER IF EXISTS trigger_mark_event_product ON public.event_products;
CREATE TRIGGER trigger_mark_event_product
  AFTER INSERT ON public.event_products
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_product_as_event_only();

-- Create RLS policy to hide event-only products from general browsing
-- First drop existing policies that might conflict
DROP POLICY IF EXISTS "Event products only visible in event context" ON public.products;

-- Create new policy to restrict event-only products
CREATE POLICY "Event products only visible in event context" 
ON public.products 
FOR SELECT 
USING (
  -- Regular products are visible to everyone
  is_event_only = FALSE
  OR 
  -- Event products are only visible to their owners and in event context
  (is_event_only = TRUE AND (
    -- Brand/retailer owners can see their event products
    (brand_id IN (SELECT id FROM brands WHERE owner_user_id = auth.uid()))
    OR 
    (retailer_id IN (SELECT id FROM retailers WHERE owner_user_id = auth.uid()))
  ))
);