-- Create events table
CREATE TABLE public.events_retail (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  retailer_id UUID NOT NULL REFERENCES public.retailers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  location_text TEXT, -- Google Maps location input
  city TEXT,
  country TEXT,
  event_date DATE NOT NULL,
  duration_days INTEGER DEFAULT 1,
  cover_photo_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create event_brands junction table
CREATE TABLE public.event_brands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events_retail(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, brand_id)
);

-- Create event_products junction table  
CREATE TABLE public.event_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events_retail(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, brand_id, product_id)
);

-- Create event_tryon_sessions for photo reuse
CREATE TABLE public.event_tryon_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events_retail(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Enable RLS
ALTER TABLE public.events_retail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_tryon_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events_retail
CREATE POLICY "Retailer owners can manage their events" 
ON public.events_retail 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.retailers r 
  WHERE r.id = events_retail.retailer_id AND r.owner_user_id = auth.uid()
));

CREATE POLICY "Public can view active events" 
ON public.events_retail 
FOR SELECT 
USING (status = 'active' AND event_date >= CURRENT_DATE);

-- RLS Policies for event_brands
CREATE POLICY "Retailer owners can manage event brands" 
ON public.event_brands 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.events_retail e
  JOIN public.retailers r ON r.id = e.retailer_id
  WHERE e.id = event_brands.event_id AND r.owner_user_id = auth.uid()
));

CREATE POLICY "Public can view event brands for active events" 
ON public.event_brands 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.events_retail e 
  WHERE e.id = event_brands.event_id AND e.status = 'active' AND e.event_date >= CURRENT_DATE
));

-- RLS Policies for event_products
CREATE POLICY "Retailer owners can manage event products" 
ON public.event_products 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.events_retail e
  JOIN public.retailers r ON r.id = e.retailer_id
  WHERE e.id = event_products.event_id AND r.owner_user_id = auth.uid()
));

CREATE POLICY "Public can view event products for active events" 
ON public.event_products 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.events_retail e 
  WHERE e.id = event_products.event_id AND e.status = 'active' AND e.event_date >= CURRENT_DATE
));

-- RLS Policies for event_tryon_sessions
CREATE POLICY "Users can manage their own event tryon sessions" 
ON public.event_tryon_sessions 
FOR ALL 
USING (auth.uid() = user_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION public.update_events_retail_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_events_retail_updated_at
  BEFORE UPDATE ON public.events_retail
  FOR EACH ROW
  EXECUTE FUNCTION public.update_events_retail_updated_at();

-- Create indexes for performance
CREATE INDEX idx_events_retail_retailer_id ON public.events_retail(retailer_id);
CREATE INDEX idx_events_retail_date_status ON public.events_retail(event_date, status);
CREATE INDEX idx_event_brands_event_id ON public.event_brands(event_id);
CREATE INDEX idx_event_products_event_id ON public.event_products(event_id);
CREATE INDEX idx_event_tryon_sessions_event_user ON public.event_tryon_sessions(event_id, user_id);