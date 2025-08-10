
-- Create ai_tryon_jobs table
CREATE TABLE public.ai_tryon_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL DEFAULT 'bitstudio',
  provider_job_id TEXT,
  person_image_id TEXT,
  outfit_image_id TEXT,
  resolution TEXT CHECK (resolution IN ('standard', 'high')) DEFAULT 'standard',
  num_images INTEGER DEFAULT 1,
  status TEXT CHECK (status IN ('pending', 'generating', 'completed', 'failed')) DEFAULT 'pending',
  result_url TEXT,
  credits_used INTEGER,
  error JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create ai_assets table for gallery/history
CREATE TABLE public.ai_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_id TEXT,
  asset_url TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT 'tryon_result',
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ai_tryon_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_assets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ai_tryon_jobs
CREATE POLICY "Users can view their own tryon jobs" 
  ON public.ai_tryon_jobs 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tryon jobs" 
  ON public.ai_tryon_jobs 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tryon jobs" 
  ON public.ai_tryon_jobs 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create RLS policies for ai_assets
CREATE POLICY "Users can view their own assets" 
  ON public.ai_assets 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own assets" 
  ON public.ai_assets 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assets" 
  ON public.ai_assets 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assets" 
  ON public.ai_assets 
  FOR DELETE 
  USING (auth.uid() = user_id);
