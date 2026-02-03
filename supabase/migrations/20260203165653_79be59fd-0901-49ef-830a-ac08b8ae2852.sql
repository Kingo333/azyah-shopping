-- Add size_chart_url column to brands and retailers tables for universal size charts
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS size_chart_url TEXT;
ALTER TABLE public.retailers ADD COLUMN IF NOT EXISTS size_chart_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.brands.size_chart_url IS 'Universal size chart image URL for all products from this brand';
COMMENT ON COLUMN public.retailers.size_chart_url IS 'Universal size chart image URL for all products from this retailer';