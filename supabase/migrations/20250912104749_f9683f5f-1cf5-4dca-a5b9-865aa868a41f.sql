-- Create voice usage tracking table
CREATE TABLE public.user_voice_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  input_seconds integer NOT NULL DEFAULT 0,
  output_seconds integer NOT NULL DEFAULT 0,
  total_seconds integer NOT NULL DEFAULT 0,
  plan_type text NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'premium')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.user_voice_usage ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own voice usage" 
ON public.user_voice_usage 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice usage" 
ON public.user_voice_usage 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own voice usage" 
ON public.user_voice_usage 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);