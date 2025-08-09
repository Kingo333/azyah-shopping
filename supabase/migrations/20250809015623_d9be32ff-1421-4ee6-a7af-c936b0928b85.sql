
-- Create tryon_jobs table for AI Try-On functionality
CREATE TABLE public.tryon_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  variant_id TEXT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued','running','succeeded','failed')),
  output_url TEXT NULL,
  error_code TEXT NULL,
  error_message TEXT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tryon_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can create their own tryon jobs" ON public.tryon_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own tryon jobs" ON public.tryon_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own tryon jobs" ON public.tryon_jobs
  FOR UPDATE USING (auth.uid() = user_id);

-- Trigger to maintain updated_at
CREATE TRIGGER set_tryon_jobs_updated_at 
  BEFORE UPDATE ON public.tryon_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for try-on images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tryon', 'tryon', false)
ON CONFLICT DO NOTHING;

-- RLS for storage bucket (restrict to owner paths)
CREATE POLICY "Users can upload their own tryon images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'tryon' AND 
    auth.uid()::text = (string_to_array(name, '/'))[3]
  );

CREATE POLICY "Users can view their own tryon images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'tryon' AND 
    auth.uid()::text = (string_to_array(name, '/'))[3]
  );

CREATE POLICY "Users can delete their own tryon images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'tryon' AND 
    auth.uid()::text = (string_to_array(name, '/'))[3]
  );
