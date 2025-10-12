-- Make toy-replica-result bucket public so users can view their generated images
UPDATE storage.buckets 
SET public = true 
WHERE name = 'toy-replica-result';