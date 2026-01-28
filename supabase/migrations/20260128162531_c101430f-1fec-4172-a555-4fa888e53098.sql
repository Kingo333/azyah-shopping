-- Fix Security Definer View issue on collab_capacity
DROP VIEW IF EXISTS collab_capacity;

CREATE VIEW collab_capacity
WITH (security_invoker=on) AS
SELECT 
  c.id as collab_id,
  c.slots_total,
  COUNT(ca.id) FILTER (WHERE ca.status = 'ACCEPTED') as slots_filled,
  COALESCE(c.slots_total, 0) - COALESCE(COUNT(ca.id) FILTER (WHERE ca.status = 'ACCEPTED'), 0) as slots_remaining,
  COUNT(ca.id) FILTER (WHERE ca.status = 'WAITLISTED') as waitlist_count,
  CASE 
    WHEN c.slots_total IS NOT NULL AND c.total_budget IS NOT NULL AND c.slots_total > 0
    THEN c.total_budget / c.slots_total
    ELSE NULL
  END as base_payout_per_slot
FROM collaborations c
LEFT JOIN collab_applications ca ON c.id = ca.collab_id
GROUP BY c.id, c.slots_total, c.total_budget;