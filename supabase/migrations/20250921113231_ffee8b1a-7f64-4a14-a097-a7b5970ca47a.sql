-- Fix the get_public_products function to avoid read-only transaction errors
CREATE OR REPLACE FUNCTION public.get_public_products(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_category TEXT DEFAULT NULL
)
RETURNS SETOF products_public
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Skip logging for now to avoid read-only transaction errors
  -- Note: Logging can be handled at application level instead
  
  -- Return limited public product data
  RETURN QUERY
  SELECT * FROM products_public pp
  WHERE (p_category IS NULL OR pp.category_slug::text = p_category)
  ORDER BY pp.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;