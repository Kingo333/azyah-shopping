-- Revert toy-replica-result bucket to private for proper security
-- Only users should see their own generated toy replicas
UPDATE storage.buckets 
SET public = false 
WHERE name = 'toy-replica-result';