
-- Additive Gemini Vision metadata fields on wardrobe_garment_analysis
ALTER TABLE public.wardrobe_garment_analysis
  ADD COLUMN IF NOT EXISTS gemini_metadata jsonb,
  ADD COLUMN IF NOT EXISTS fashionclip_metadata jsonb,
  ADD COLUMN IF NOT EXISTS final_metadata jsonb,
  ADD COLUMN IF NOT EXISTS final_prompt_hint text,
  ADD COLUMN IF NOT EXISTS primary_provider text,
  ADD COLUMN IF NOT EXISTS gemini_status text,
  ADD COLUMN IF NOT EXISTS gemini_error text,
  ADD COLUMN IF NOT EXISTS gemini_version text;

CREATE INDEX IF NOT EXISTS idx_wga_image_hash ON public.wardrobe_garment_analysis(image_hash);
CREATE INDEX IF NOT EXISTS idx_wga_gemini_status ON public.wardrobe_garment_analysis(gemini_status);
