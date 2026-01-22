-- Populate country_code for existing brands
-- Set UAE brands (local brands)
UPDATE public.brands 
SET country_code = 'AE' 
WHERE slug IN ('alex-fashion-co', 'abayacult', 'abdullahiking33')
AND (country_code IS NULL OR country_code = '');

-- Set UK brands (ASOS)
UPDATE public.brands 
SET country_code = 'GB' 
WHERE slug = 'asos'
AND (country_code IS NULL OR country_code = '');

-- Set any remaining brands without country to AE as default
UPDATE public.brands 
SET country_code = 'AE' 
WHERE country_code IS NULL;

-- Add index for faster country-based queries
CREATE INDEX IF NOT EXISTS idx_brands_country_code ON public.brands(country_code);

-- Add comment for documentation
COMMENT ON COLUMN public.brands.country_code IS 'ISO 3166-1 alpha-2 country code for brand headquarters (e.g., AE, GB, US)';