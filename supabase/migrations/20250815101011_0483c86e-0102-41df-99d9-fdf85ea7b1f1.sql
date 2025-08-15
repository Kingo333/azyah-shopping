
-- Create toy_replicas table as specified
CREATE TABLE public.toy_replicas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  source_url TEXT,
  result_url TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'succeeded', 'failed')),
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.toy_replicas ENABLE ROW LEVEL SECURITY;

-- Users can insert their own toy replicas
CREATE POLICY "Users can create their own toy replicas" 
  ON public.toy_replicas 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own toy replicas
CREATE POLICY "Users can view their own toy replicas" 
  ON public.toy_replicas 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can update their own toy replicas
CREATE POLICY "Users can update their own toy replicas" 
  ON public.toy_replicas 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_toy_replicas_updated_at
  BEFORE UPDATE ON public.toy_replicas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
