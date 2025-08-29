-- Fix remaining security linter warnings

-- Fix function search path issues by setting search_path on functions that don't have it
CREATE OR REPLACE FUNCTION public.check_payment_encryption()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- This function serves as a reminder that payment data should be encrypted at rest
  -- and that sensitive fields like payment_intent_id should be properly secured
  RETURN 'Payment data encryption check: Ensure sensitive payment fields are encrypted at application level';
END;
$$;

-- Update any other functions that might be missing search_path
CREATE OR REPLACE FUNCTION public.tier_from_price_aed(aed_price numeric)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
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

-- Fix the embed_query function to have proper search_path
CREATE OR REPLACE FUNCTION public.embed_query(query_text text)
RETURNS numeric[]
LANGUAGE plpgsql
IMMUTABLE 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Placeholder for embedding function
  -- In real implementation, use OpenAI embeddings API
  RETURN array_fill(0.0, ARRAY[1536]);
END;
$$;