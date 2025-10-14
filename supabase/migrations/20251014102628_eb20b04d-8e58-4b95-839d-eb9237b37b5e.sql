-- Create wardrobe_layers table for organizing wardrobe items by category
CREATE TABLE IF NOT EXISTS public.wardrobe_layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('top', 'bottom', 'dress', 'outerwear', 'shoes', 'bag', 'accessory')),
  is_pinned BOOLEAN DEFAULT false,
  layer_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, category)
);

-- Enable RLS
ALTER TABLE public.wardrobe_layers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own layers"
  ON public.wardrobe_layers FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_wardrobe_layers_user_order ON public.wardrobe_layers(user_id, layer_order);
CREATE INDEX IF NOT EXISTS idx_wardrobe_layers_user_pinned ON public.wardrobe_layers(user_id, is_pinned);

-- Trigger for updated_at
CREATE TRIGGER update_wardrobe_layers_updated_at
  BEFORE UPDATE ON public.wardrobe_layers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();