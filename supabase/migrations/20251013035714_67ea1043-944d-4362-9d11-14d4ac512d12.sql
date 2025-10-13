-- Clean up stuck jobs without provider_job_id
UPDATE public.event_tryon_jobs
SET 
  status = 'failed',
  error = 'Job stuck in queue - cleaned up automatically',
  completed_at = now()
WHERE 
  status IN ('queued', 'processing')
  AND provider_job_id IS NULL
  AND created_at < now() - INTERVAL '5 minutes';