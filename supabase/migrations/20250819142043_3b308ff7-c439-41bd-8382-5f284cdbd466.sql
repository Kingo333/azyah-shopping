-- Create beauty_consults table (if not exists)
CREATE TABLE IF NOT EXISTS public.beauty_consults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  skin_profile JSONB NOT NULL,
  recommendations JSONB NOT NULL,
  confidence NUMERIC NOT NULL,
  lighting_note TEXT,
  sources JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create beauty_consult_events table (if not exists)
CREATE TABLE IF NOT EXISTS public.beauty_consult_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event TEXT NOT NULL,
  payload JSONB,
  ts TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on beauty_consults (if not already enabled)
ALTER TABLE public.beauty_consults ENABLE ROW LEVEL SECURITY;

-- Enable RLS on beauty_consult_events (if not already enabled)
ALTER TABLE public.beauty_consult_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "beauty_consults_user_rw" ON public.beauty_consults;
DROP POLICY IF EXISTS "beauty_consult_events_user_rw" ON public.beauty_consult_events;

-- Create RLS policies for beauty_consults
CREATE POLICY "beauty_consults_user_rw" ON public.beauty_consults
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for beauty_consult_events
CREATE POLICY "beauty_consult_events_user_rw" ON public.beauty_consult_events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create function to log user data access
CREATE OR REPLACE FUNCTION public.log_user_data_access(
  action_type TEXT,
  table_name TEXT,
  accessed_user_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    table_name,
    accessed_user_id,
    ip_address
  ) VALUES (
    auth.uid(),
    action_type,
    table_name,
    accessed_user_id,
    inet_client_addr()
  );
END;
$$;