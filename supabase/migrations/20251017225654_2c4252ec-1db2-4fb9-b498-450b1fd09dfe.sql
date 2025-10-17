-- Create fit_comments table for community interactions
CREATE TABLE IF NOT EXISTS public.fit_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fit_id UUID NOT NULL REFERENCES public.fits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment_text TEXT NOT NULL CHECK (char_length(comment_text) > 0 AND char_length(comment_text) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fit_comments_fit_id ON public.fit_comments(fit_id);
CREATE INDEX IF NOT EXISTS idx_fit_comments_created_at ON public.fit_comments(created_at DESC);

-- Enable RLS on fit_comments
ALTER TABLE public.fit_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fit_comments
CREATE POLICY "Anyone can view comments on public fits"
  ON public.fit_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.fits
      WHERE fits.id = fit_comments.fit_id
      AND fits.is_public = true
    )
  );

CREATE POLICY "Authenticated users can add comments"
  ON public.fit_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.fits
      WHERE fits.id = fit_comments.fit_id
      AND fits.is_public = true
    )
  );

CREATE POLICY "Users can update their own comments"
  ON public.fit_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.fit_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment_count to fits table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'fits'
    AND column_name = 'comment_count'
  ) THEN
    ALTER TABLE public.fits ADD COLUMN comment_count INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Create function to auto-update comment count
CREATE OR REPLACE FUNCTION public.update_fit_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.fits
    SET comment_count = comment_count + 1
    WHERE id = NEW.fit_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.fits
    SET comment_count = GREATEST(0, comment_count - 1)
    WHERE id = OLD.fit_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for comment count
DROP TRIGGER IF EXISTS update_fit_comment_count_trigger ON public.fit_comments;
CREATE TRIGGER update_fit_comment_count_trigger
AFTER INSERT OR DELETE ON public.fit_comments
FOR EACH ROW EXECUTE FUNCTION public.update_fit_comment_count();

-- Add name column to wardrobe_items if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'wardrobe_items'
    AND column_name = 'name'
  ) THEN
    ALTER TABLE public.wardrobe_items ADD COLUMN name TEXT;
  END IF;
END $$;