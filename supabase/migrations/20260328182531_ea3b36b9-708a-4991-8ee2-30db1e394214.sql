-- Fix event_brands policy
DROP POLICY IF EXISTS "Public can view brands for active events" ON public.event_brands;
CREATE POLICY "Public can view brands for active events"
ON public.event_brands FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM retail_events e
    WHERE e.id = event_brands.event_id
      AND e.status = 'active'
      AND COALESCE(e.end_date, e.event_date) >= CURRENT_DATE
  )
);

-- Fix event_brand_products policy
DROP POLICY IF EXISTS "Public can view products for active events" ON public.event_brand_products;
CREATE POLICY "Public can view products for active events"
ON public.event_brand_products FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM event_brands eb
    JOIN retail_events e ON e.id = eb.event_id
    WHERE eb.id = event_brand_products.event_brand_id
      AND e.status = 'active'
      AND COALESCE(e.end_date, e.event_date) >= CURRENT_DATE
  )
);