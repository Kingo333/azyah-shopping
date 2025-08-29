-- Enable Row Level Security on brands_public and retailers_public tables
ALTER TABLE public.brands_public ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retailers_public ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for brands_public table
CREATE POLICY "Anyone can view public brand data" ON public.brands_public
FOR SELECT USING (true);

-- Create RLS policies for retailers_public table  
CREATE POLICY "Anyone can view public retailer data" ON public.retailers_public
FOR SELECT USING (true);

-- These tables are designed to be publicly accessible as they only contain safe, non-sensitive data
-- The underlying brands and retailers tables are protected with authentication requirements
-- These public views provide a secure way to display brand/retailer information without exposing sensitive data