-- Fix functions without proper search_path settings
-- This addresses the "Function Search Path Mutable" warning

-- Update functions to have secure search_path
CREATE OR REPLACE FUNCTION public.embed_query(query_text text)
RETURNS numeric[]
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Placeholder for embedding function
  -- In real implementation, use OpenAI embeddings API
  RETURN array_fill(0.0, ARRAY[1536]);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_admin_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- This function will be used to create the initial admin user
  -- Should be called after authentication is set up
  NULL;
END;
$$;