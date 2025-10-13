-- Schema hardening for event_tryon_jobs
-- Add columns for provider state tracking and debugging

ALTER TABLE public.event_tryon_jobs
  ADD COLUMN IF NOT EXISTS provider_status TEXT,
  ADD COLUMN IF NOT EXISTS provider_raw JSONB;

-- Index for faster polling queries
CREATE INDEX IF NOT EXISTS idx_tryon_jobs_provider_job_id 
  ON public.event_tryon_jobs(provider_job_id);

-- Ensure updated_at trigger exists
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_tryon_jobs_updated ON public.event_tryon_jobs;

CREATE TRIGGER trg_event_tryon_jobs_updated
  BEFORE UPDATE ON public.event_tryon_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();