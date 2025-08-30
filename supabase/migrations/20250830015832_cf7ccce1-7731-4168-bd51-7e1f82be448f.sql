-- Create beauty profiles table for storing selfie analysis results
CREATE TABLE IF NOT EXISTS public.beauty_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  skin_tone TEXT,
  undertone TEXT,
  face_shape TEXT,
  color_palette TEXT[],
  selfie_url TEXT,
  analysis_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.beauty_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own beauty profile" 
ON public.beauty_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own beauty profile" 
ON public.beauty_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own beauty profile" 
ON public.beauty_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own beauty profile" 
ON public.beauty_profiles 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_beauty_profiles_updated_at
BEFORE UPDATE ON public.beauty_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();