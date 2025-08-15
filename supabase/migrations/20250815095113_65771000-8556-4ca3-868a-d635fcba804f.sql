
-- Create toy_replicas table
CREATE TABLE public.toy_replicas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  source_url TEXT,
  result_url TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'succeeded', 'failed')),
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.toy_replicas ENABLE ROW LEVEL SECURITY;

-- Users can view their own toy replicas
CREATE POLICY "Users can view their own toy replicas" 
  ON public.toy_replicas 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can create their own toy replicas
CREATE POLICY "Users can create their own toy replicas" 
  ON public.toy_replicas 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own toy replicas
CREATE POLICY "Users can update their own toy replicas" 
  ON public.toy_replicas 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('toy-replica-source', 'toy-replica-source', false),
  ('toy-replica-result', 'toy-replica-result', true);

-- RLS policies for toy-replica-source bucket (private)
CREATE POLICY "Users can upload their own source images" 
  ON storage.objects 
  FOR INSERT 
  WITH CHECK (
    bucket_id = 'toy-replica-source' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own source images" 
  ON storage.objects 
  FOR SELECT 
  USING (
    bucket_id = 'toy-replica-source' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- RLS policies for toy-replica-result bucket (public)
CREATE POLICY "Anyone can view result images" 
  ON storage.objects 
  FOR SELECT 
  USING (bucket_id = 'toy-replica-result');

CREATE POLICY "Users can upload result images" 
  ON storage.objects 
  FOR INSERT 
  WITH CHECK (bucket_id = 'toy-replica-result');

-- Add trigger for updated_at
CREATE TRIGGER update_toy_replicas_updated_at
  BEFORE UPDATE ON public.toy_replicas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
