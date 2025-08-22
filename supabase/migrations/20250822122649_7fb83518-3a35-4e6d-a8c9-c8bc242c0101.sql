-- Create webhook_events table for idempotency tracking
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'ziina',
  event TEXT NOT NULL,
  pi_id TEXT NOT NULL,
  raw_body JSONB NOT NULL DEFAULT '{}',
  signature TEXT,
  ip TEXT,
  processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_webhook_events_pi_id_event ON public.webhook_events(pi_id, event);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON public.webhook_events(processed);

-- Enable RLS
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Only service role can manage webhook events
CREATE POLICY "Service can manage webhook events" ON public.webhook_events
FOR ALL USING (auth.role() = 'service_role');

-- Add trigger for updated_at
CREATE TRIGGER update_webhook_events_updated_at
  BEFORE UPDATE ON public.webhook_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();