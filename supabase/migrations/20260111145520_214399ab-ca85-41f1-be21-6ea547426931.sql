-- Add preferred_currency to users table for shopper currency preference
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS preferred_currency text DEFAULT NULL;

-- Add country_code to brands table (ISO2 format for reliable matching)
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS country_code text DEFAULT NULL;

-- Create exchange rates table for currency conversion
CREATE TABLE IF NOT EXISTS public.fx_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency text NOT NULL,
  quote_currency text NOT NULL,
  rate numeric(18, 8) NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  source text DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(base_currency, quote_currency)
);

-- Enable RLS with public read access
ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to fx_rates
CREATE POLICY "Allow public read access to fx_rates"
  ON public.fx_rates FOR SELECT
  USING (true);

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_fx_rates_currencies ON public.fx_rates(base_currency, quote_currency);

-- Seed initial exchange rates (all based on USD as intermediate)
-- These should be updated periodically via edge function or manual refresh
INSERT INTO public.fx_rates (base_currency, quote_currency, rate) VALUES
  ('USD', 'AED', 3.67),
  ('USD', 'SAR', 3.75),
  ('USD', 'EUR', 0.92),
  ('USD', 'GBP', 0.79),
  ('USD', 'QAR', 3.64),
  ('USD', 'KWD', 0.31),
  ('USD', 'BHD', 0.38),
  ('USD', 'OMR', 0.38),
  ('AED', 'USD', 0.27),
  ('AED', 'SAR', 1.02),
  ('AED', 'EUR', 0.25),
  ('AED', 'GBP', 0.22),
  ('AED', 'QAR', 0.99),
  ('AED', 'KWD', 0.08),
  ('AED', 'BHD', 0.10),
  ('AED', 'OMR', 0.10),
  ('SAR', 'USD', 0.27),
  ('SAR', 'AED', 0.98),
  ('EUR', 'USD', 1.09),
  ('EUR', 'AED', 3.99),
  ('GBP', 'USD', 1.27),
  ('GBP', 'AED', 4.66)
ON CONFLICT (base_currency, quote_currency) DO UPDATE SET 
  rate = EXCLUDED.rate, 
  updated_at = now();

-- Backfill existing brands to AE if they have no country_code (pre-launch default)
UPDATE public.brands 
SET country_code = 'AE' 
WHERE country_code IS NULL AND category = 'salon';

-- Add comment for clarity
COMMENT ON COLUMN public.users.preferred_currency IS 'Shopper preferred currency for price display (ISO 4217 code)';
COMMENT ON COLUMN public.brands.country_code IS 'Brand primary country (ISO 3166-1 alpha-2 code)';