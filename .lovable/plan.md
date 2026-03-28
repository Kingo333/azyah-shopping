

## Fix: Events Not Showing for Shoppers

### Root Cause
The RLS policy `"Public can view active events"` on `retail_events` has this condition:

```sql
(status = 'active') AND (event_date >= CURRENT_DATE)
```

`event_date` is the **start date** (Jan 31, 2026). Today is March 28, 2026 — so `Jan 31 >= March 28` is **false**, and the row is invisible to shoppers. The retailer can still see it because they have a separate `ALL` policy.

### Fix
One database migration to update the RLS policy:

```sql
DROP POLICY "Public can view active events" ON public.retail_events;

CREATE POLICY "Public can view active events"
ON public.retail_events
FOR SELECT
USING (
  status = 'active'
  AND COALESCE(end_date, event_date) >= CURRENT_DATE
);
```

This uses `end_date` when available (multi-day events stay visible until they end), and falls back to `event_date` for single-day events.

### Files Changed
- **Database migration only** — no code changes needed. The queries in `Events.tsx` and `Profile.tsx` already filter by `end_date >= today` at the application level, but the RLS policy was blocking the rows before the app query even ran.

