-- Create import jobs table for tracking async import progress
CREATE TABLE IF NOT EXISTS public.import_job_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL DEFAULT 'asos_bulk_import',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  config JSONB NOT NULL DEFAULT '{}',
  result JSONB DEFAULT NULL,
  error_message TEXT DEFAULT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.import_job_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own import job status" 
ON public.import_job_status 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own import job status" 
ON public.import_job_status 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own import job status" 
ON public.import_job_status 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_import_job_status_updated_at
BEFORE UPDATE ON public.import_job_status
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_import_job_status_user_id ON public.import_job_status(user_id);
CREATE INDEX idx_import_job_status_status ON public.import_job_status(status);
CREATE INDEX idx_import_job_status_created_at ON public.import_job_status(created_at DESC);