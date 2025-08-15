
-- Create the toy_replicas table
CREATE TABLE public.toy_replicas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  source_url TEXT,
  result_url TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.toy_replicas ENABLE ROW LEVEL SECURITY;

-- Create policies for users to manage their own toy replicas
CREATE POLICY "Users can create their own toy replicas" 
  ON public.toy_replicas 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own toy replicas" 
  ON public.toy_replicas 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own toy replicas" 
  ON public.toy_replicas 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create storage buckets for toy replica files
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('toy-replica-source', 'toy-replica-source', false),
  ('toy-replica-result', 'toy-replica-result', true);

-- Create storage policies for toy-replica-source bucket (private)
CREATE POLICY "Users can upload their own source images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'toy-replica-source' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own source images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'toy-replica-source' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create storage policies for toy-replica-result bucket (public)
CREATE POLICY "Anyone can view result images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'toy-replica-result');

CREATE POLICY "Service can upload result images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'toy-replica-result');

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_toy_replicas_updated_at
  BEFORE UPDATE ON public.toy_replicas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
