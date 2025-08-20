-- Fix remaining function security paths and update to latest format
-- This addresses the function search path mutable warning

-- Fix the embedQuery function with proper search path
DROP FUNCTION IF EXISTS public.embedQuery(text);

-- Update the function with consistent naming and search path
CREATE OR REPLACE FUNCTION public.embed_query(query_text text)
RETURNS numeric[]
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Placeholder for embedding function
  -- In real implementation, use OpenAI embeddings API
  RETURN array_fill(0.0, ARRAY[1536]);
END;
$$;

-- Update other functions that may need search path fixes
CREATE OR REPLACE FUNCTION public.tier_from_price_aed(aed_price numeric)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  drugstore_max numeric := COALESCE(current_setting('app.price_tier_drugstore_max', true)::numeric, 60);
  mid_max numeric := COALESCE(current_setting('app.price_tier_mid_max', true)::numeric, 180);
BEGIN
  IF aed_price <= drugstore_max THEN
    RETURN 'drugstore';
  ELSIF aed_price <= mid_max THEN
    RETURN 'mid';
  ELSE
    RETURN 'premium';
  END IF;
END;
$$;