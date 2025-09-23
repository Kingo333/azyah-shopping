-- Create storage bucket for event assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'event-assets', 
  'event-assets', 
  true, 
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Storage policies for event assets
CREATE POLICY "Event asset images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'event-assets');

CREATE POLICY "Authenticated users can upload event assets" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'event-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Retailers can manage their event assets" 
ON storage.objects 
FOR ALL 
USING (
  bucket_id = 'event-assets' AND 
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create event_brands table for storing brands in events
CREATE TABLE public.event_brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL,
  brand_name TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on event_brands
ALTER TABLE public.event_brands ENABLE ROW LEVEL SECURITY;

-- Policies for event_brands
CREATE POLICY "Public can view brands for active events" 
ON public.event_brands 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM retail_events e 
    WHERE e.id = event_brands.event_id 
    AND e.status = 'active'
    AND e.event_date >= CURRENT_DATE
  )
);

CREATE POLICY "Retailer owners can manage event brands" 
ON public.event_brands 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM retail_events e 
    JOIN retailers r ON r.id = e.retailer_id 
    WHERE e.id = event_brands.event_id 
    AND r.owner_user_id = auth.uid()
  )
);

-- Create event_brand_products table for product images
CREATE TABLE public.event_brand_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_brand_id UUID NOT NULL REFERENCES public.event_brands(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  try_on_data JSONB DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on event_brand_products
ALTER TABLE public.event_brand_products ENABLE ROW LEVEL SECURITY;

-- Policies for event_brand_products
CREATE POLICY "Public can view products for active events" 
ON public.event_brand_products 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM event_brands eb
    JOIN retail_events e ON e.id = eb.event_id
    WHERE eb.id = event_brand_products.event_brand_id
    AND e.status = 'active'
    AND e.event_date >= CURRENT_DATE
  )
);

CREATE POLICY "Retailer owners can manage event brand products" 
ON public.event_brand_products 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM event_brands eb
    JOIN retail_events e ON e.id = eb.event_id
    JOIN retailers r ON r.id = e.retailer_id
    WHERE eb.id = event_brand_products.event_brand_id
    AND r.owner_user_id = auth.uid()
  )
);

-- Create event_user_photos table for user photos per event
CREATE TABLE public.event_user_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL,
  user_id UUID NOT NULL,
  photo_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable RLS on event_user_photos
ALTER TABLE public.event_user_photos ENABLE ROW LEVEL SECURITY;

-- Policies for event_user_photos
CREATE POLICY "Users can manage their own event photos" 
ON public.event_user_photos 
FOR ALL 
USING (auth.uid() = user_id);

-- Add constraints to limit brands and products per event/brand
CREATE OR REPLACE FUNCTION public.check_event_brand_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM event_brands WHERE event_id = NEW.event_id) >= 10 THEN
    RAISE EXCEPTION 'Maximum 10 brands allowed per event';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_brand_limit_trigger
  BEFORE INSERT ON public.event_brands
  FOR EACH ROW EXECUTE FUNCTION public.check_event_brand_limit();

CREATE OR REPLACE FUNCTION public.check_brand_product_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM event_brand_products WHERE event_brand_id = NEW.event_brand_id) >= 5 THEN
    RAISE EXCEPTION 'Maximum 5 products allowed per brand';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER brand_product_limit_trigger
  BEFORE INSERT ON public.event_brand_products
  FOR EACH ROW EXECUTE FUNCTION public.check_brand_product_limit();

-- Add indexes for better performance
CREATE INDEX idx_event_brands_event_id ON public.event_brands(event_id);
CREATE INDEX idx_event_brand_products_brand_id ON public.event_brand_products(event_brand_id);
CREATE INDEX idx_event_user_photos_event_user ON public.event_user_photos(event_id, user_id);