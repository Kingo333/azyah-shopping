-- Add provider_job_id column to event_tryon_jobs table for background processing
ALTER TABLE public.event_tryon_jobs
ADD COLUMN IF NOT EXISTS provider_job_id text;

-- Add index for faster lookups when polling jobs
CREATE INDEX IF NOT EXISTS idx_event_tryon_jobs_provider_job_id 
ON public.event_tryon_jobs(provider_job_id);

-- Add index for status queries
CREATE INDEX IF NOT EXISTS idx_event_tryon_jobs_status 
ON public.event_tryon_jobs(status);

-- Add composite index for user + event queries
CREATE INDEX IF NOT EXISTS idx_event_tryon_jobs_user_event 
ON public.event_tryon_jobs(user_id, event_id, created_at DESC);