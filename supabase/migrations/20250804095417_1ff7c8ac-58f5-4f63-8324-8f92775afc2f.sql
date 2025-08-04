-- Create likes table for dedicated like functionality
CREATE TABLE public.likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Enable RLS
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- Create policies for likes
CREATE POLICY "Users can view their own likes" 
ON public.likes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own likes" 
ON public.likes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes" 
ON public.likes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create closets table for enhanced closet functionality
CREATE TABLE public.closets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'My Closet',
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for closets
ALTER TABLE public.closets ENABLE ROW LEVEL SECURITY;

-- Create policies for closets
CREATE POLICY "Users can view their own closets" 
ON public.closets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public closets" 
ON public.closets 
FOR SELECT 
USING (is_public = true);

CREATE POLICY "Users can manage their own closets" 
ON public.closets 
FOR ALL 
USING (auth.uid() = user_id);

-- Create closet_items table
CREATE TABLE public.closet_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  closet_id UUID NOT NULL REFERENCES public.closets(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sort_order INTEGER DEFAULT 0,
  UNIQUE(closet_id, product_id)
);

-- Enable RLS for closet_items
ALTER TABLE public.closet_items ENABLE ROW LEVEL SECURITY;

-- Create policies for closet_items
CREATE POLICY "Users can view items in their own closets" 
ON public.closet_items 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.closets 
  WHERE closets.id = closet_items.closet_id 
  AND closets.user_id = auth.uid()
));

CREATE POLICY "Anyone can view items in public closets" 
ON public.closet_items 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.closets 
  WHERE closets.id = closet_items.closet_id 
  AND closets.is_public = true
));

CREATE POLICY "Users can manage items in their own closets" 
ON public.closet_items 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.closets 
  WHERE closets.id = closet_items.closet_id 
  AND closets.user_id = auth.uid()
));

-- Create closet_ratings table for 5-star rating system
CREATE TABLE public.closet_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  closet_id UUID NOT NULL REFERENCES public.closets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(closet_id, user_id)
);

-- Enable RLS for closet_ratings
ALTER TABLE public.closet_ratings ENABLE ROW LEVEL SECURITY;

-- Create policies for closet_ratings
CREATE POLICY "Anyone can view ratings for public closets" 
ON public.closet_ratings 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.closets 
  WHERE closets.id = closet_ratings.closet_id 
  AND closets.is_public = true
));

CREATE POLICY "Users can create ratings for public closets" 
ON public.closet_ratings 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.closets 
    WHERE closets.id = closet_ratings.closet_id 
    AND closets.is_public = true
    AND closets.user_id != auth.uid()
  )
);

CREATE POLICY "Users can update their own ratings" 
ON public.closet_ratings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add country field to users table
ALTER TABLE public.users ADD COLUMN country TEXT;

-- Create trigger for updated_at on closets
CREATE TRIGGER update_closets_updated_at
BEFORE UPDATE ON public.closets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on closet_ratings
CREATE TRIGGER update_closet_ratings_updated_at
BEFORE UPDATE ON public.closet_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();