
-- Create brand_follows table for dedicated brand following
CREATE TABLE public.brand_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, brand_id)
);

-- Add indexes for fast lookups
CREATE INDEX idx_brand_follows_user_id ON public.brand_follows(user_id);
CREATE INDEX idx_brand_follows_brand_id ON public.brand_follows(brand_id);

-- Enable RLS
ALTER TABLE public.brand_follows ENABLE ROW LEVEL SECURITY;

-- Users can read their own follows
CREATE POLICY "Users can view own brand follows"
  ON public.brand_follows FOR SELECT
  USING (auth.uid() = user_id);

-- Users can follow brands (insert own rows)
CREATE POLICY "Users can follow brands"
  ON public.brand_follows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can unfollow brands (delete own rows)
CREATE POLICY "Users can unfollow brands"
  ON public.brand_follows FOR DELETE
  USING (auth.uid() = user_id);
