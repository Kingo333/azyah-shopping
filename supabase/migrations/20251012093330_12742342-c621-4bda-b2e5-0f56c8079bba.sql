-- Phase 1: Add Provider Fields and Job Tracking

-- Make try-on engine pluggable
ALTER TABLE public.event_brand_products
  ADD COLUMN IF NOT EXISTS try_on_provider text DEFAULT 'gemini',
  ADD COLUMN IF NOT EXISTS try_on_config jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS try_on_ready boolean DEFAULT false;

-- Add provider metadata to user photos
ALTER TABLE public.event_user_photos
  ADD COLUMN IF NOT EXISTS vto_provider text DEFAULT 'gemini',
  ADD COLUMN IF NOT EXISTS vto_features jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS vto_ready boolean DEFAULT false;

-- Track try-on jobs with full audit trail
CREATE TABLE IF NOT EXISTS public.event_tryon_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.retail_events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.event_brand_products(id) ON DELETE CASCADE,
  
  -- Input references
  input_person_path text NOT NULL,
  input_outfit_path text NOT NULL,
  
  -- Provider config
  provider text NOT NULL DEFAULT 'gemini',
  model text,
  
  -- Job lifecycle
  status text NOT NULL DEFAULT 'queued',
  output_path text,
  error text,
  credits_used integer,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

-- Enable RLS
ALTER TABLE public.event_tryon_jobs ENABLE ROW LEVEL SECURITY;

-- Users can view their own jobs
CREATE POLICY "Users can view their own try-on jobs"
ON public.event_tryon_jobs FOR SELECT
USING (auth.uid() = user_id);

-- Users can create jobs
CREATE POLICY "Users can create try-on jobs"
ON public.event_tryon_jobs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Service role can update jobs
CREATE POLICY "Service role can update jobs"
ON public.event_tryon_jobs FOR UPDATE
USING (auth.role() = 'service_role');

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tryon_jobs_user ON public.event_tryon_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_tryon_jobs_event ON public.event_tryon_jobs(event_id);
CREATE INDEX IF NOT EXISTS idx_tryon_jobs_status ON public.event_tryon_jobs(status);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tryon_jobs_updated
BEFORE UPDATE ON public.event_tryon_jobs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Backfill existing data with bitstudio provider
UPDATE public.event_brand_products
SET try_on_provider = 'bitstudio',
    try_on_ready = (try_on_data IS NOT NULL AND try_on_data::text != '{}')
WHERE try_on_data IS NOT NULL AND try_on_data::text != '{}';

UPDATE public.event_user_photos
SET vto_provider = 'bitstudio',
    vto_ready = true;

-- Create render output bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-tryon-renders', 'event-tryon-renders', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: Anyone can read renders
CREATE POLICY "Public can view renders"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-tryon-renders');

-- RLS: Authenticated users can upload renders
CREATE POLICY "Authenticated users can upload renders"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event-tryon-renders'
  AND auth.role() = 'authenticated'
);