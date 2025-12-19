-- Add category column to brands table
ALTER TABLE public.brands
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'fashion_brand';

-- Update any existing brands with NULL category to 'fashion_brand'
UPDATE public.brands SET category = 'fashion_brand' WHERE category IS NULL;

-- Create brand_services table for agencies and studios to list their services
CREATE TABLE IF NOT EXISTS public.brand_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  service_type TEXT NOT NULL DEFAULT 'other',
  min_price NUMERIC,
  max_price NUMERIC,
  discount_percent INTEGER CHECK (discount_percent IS NULL OR (discount_percent >= 0 AND discount_percent <= 100)),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on brand_services
ALTER TABLE public.brand_services ENABLE ROW LEVEL SECURITY;

-- Policy: Brand owners can manage their own services
CREATE POLICY "Brand owners can manage their services"
ON public.brand_services
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.brands
    WHERE brands.id = brand_services.brand_id
    AND brands.owner_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.brands
    WHERE brands.id = brand_services.brand_id
    AND brands.owner_user_id = auth.uid()
  )
);

-- Policy: Anyone can view active services
CREATE POLICY "Anyone can view active services"
ON public.brand_services
FOR SELECT
USING (is_active = true);

-- Create service_leads table for fashion brands to request intros
CREATE TABLE IF NOT EXISTS public.service_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.brand_services(id) ON DELETE CASCADE,
  requesting_brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on service_leads
ALTER TABLE public.service_leads ENABLE ROW LEVEL SECURITY;

-- Policy: Fashion brands can create leads for services
CREATE POLICY "Brands can create service leads"
ON public.service_leads
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.brands
    WHERE brands.id = service_leads.requesting_brand_id
    AND brands.owner_user_id = auth.uid()
  )
);

-- Policy: Requesting brand can view their own leads
CREATE POLICY "Brands can view their own leads"
ON public.service_leads
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.brands
    WHERE brands.id = service_leads.requesting_brand_id
    AND brands.owner_user_id = auth.uid()
  )
);

-- Policy: Service provider (agency/studio) can view leads for their services
CREATE POLICY "Service providers can view leads for their services"
ON public.service_leads
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.brand_services bs
    JOIN public.brands b ON b.id = bs.brand_id
    WHERE bs.id = service_leads.service_id
    AND b.owner_user_id = auth.uid()
  )
);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add trigger for brand_services updated_at
DROP TRIGGER IF EXISTS update_brand_services_updated_at ON public.brand_services;
CREATE TRIGGER update_brand_services_updated_at
  BEFORE UPDATE ON public.brand_services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster service lookups
CREATE INDEX IF NOT EXISTS idx_brand_services_brand_id ON public.brand_services(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_services_active ON public.brand_services(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_service_leads_service_id ON public.service_leads(service_id);
CREATE INDEX IF NOT EXISTS idx_service_leads_requesting_brand ON public.service_leads(requesting_brand_id);