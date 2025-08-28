-- Fix security vulnerabilities for brands_public and retailers_public tables
-- Restrict access to authenticated users only while preserving functionality

-- Enable RLS on brands_public table
ALTER TABLE public.brands_public ENABLE ROW LEVEL SECURITY;

-- Create policy to allow only authenticated users to access brand data
CREATE POLICY "Authenticated users can view brand data" 
ON public.brands_public 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Enable RLS on retailers_public table  
ALTER TABLE public.retailers_public ENABLE ROW LEVEL SECURITY;

-- Create policy to allow only authenticated users to access retailer data
CREATE POLICY "Authenticated users can view retailer data" 
ON public.retailers_public 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Block all anonymous access to sensitive business data
CREATE POLICY "Block anonymous access to brands_public" 
ON public.brands_public 
FOR ALL 
USING (false);

CREATE POLICY "Block anonymous access to retailers_public" 
ON public.retailers_public 
FOR ALL 
USING (false);