-- Create video job lifecycle log table for debugging
CREATE TABLE public.video_job_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  input_image_url TEXT,
  used_image_url TEXT,
  job_id TEXT,
  action TEXT NOT NULL,
  step TEXT,
  provider_status_code INTEGER,
  body_snippet TEXT,
  error_message TEXT,
  is_success BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.video_job_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own logs
CREATE POLICY "Users can view their own video job logs"
ON public.video_job_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Service role can insert (edge function uses service role)
CREATE POLICY "Service role can insert video job logs"
ON public.video_job_logs
FOR INSERT
WITH CHECK (true);

-- Index for user lookups
CREATE INDEX idx_video_job_logs_user_id ON public.video_job_logs(user_id);
CREATE INDEX idx_video_job_logs_job_id ON public.video_job_logs(job_id);