DROP POLICY IF EXISTS "Public can view active events" ON public.retail_events;

CREATE POLICY "Public can view active events"
ON public.retail_events
FOR SELECT
USING (
  status = 'active'
  AND COALESCE(end_date, event_date) >= CURRENT_DATE
);