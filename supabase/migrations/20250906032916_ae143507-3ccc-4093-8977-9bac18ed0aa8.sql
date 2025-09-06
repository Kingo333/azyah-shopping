-- Remove the problematic views and replace with secure functions
DROP VIEW IF EXISTS public.categories_public CASCADE;
DROP VIEW IF EXISTS public.product_like_counts CASCADE;
DROP VIEW IF EXISTS public.products_landing_public CASCADE;

-- Replace categories_public view with a secure function
CREATE OR REPLACE FUNCTION public.get_public_categories()
RETURNS TABLE(slug text, name text, product_count bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Require authentication to prevent competitive market analysis
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access category metrics';
  END IF;
  
  -- Log category metrics access for audit
  PERFORM public.log_user_data_access(
    'VIEW_CATEGORY_METRICS', 
    'categories',
    auth.uid()
  );
  
  -- Calculate product counts dynamically to avoid exposing business intelligence
  RETURN QUERY
  SELECT 
    p.category_slug::text as slug,
    INITCAP(REPLACE(p.category_slug::text, '_', ' ')) as name,
    COUNT(*)::bigint as product_count
  FROM public.products p
  WHERE p.status = 'active'
    AND p.category_slug IS NOT NULL
  GROUP BY p.category_slug
  ORDER BY product_count DESC;
END;
$$;

-- Replace product_like_counts view with a secure function  
CREATE OR REPLACE FUNCTION public.get_product_like_counts(product_ids uuid[] DEFAULT NULL)
RETURNS TABLE(product_id uuid, like_count bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function returns like counts for products
  -- No authentication required as this is public product data
  
  RETURN QUERY
  SELECT 
    l.product_id,
    COUNT(*)::bigint as like_count
  FROM public.likes l
  JOIN public.products p ON p.id = l.product_id AND p.status = 'active'
  WHERE (product_ids IS NULL OR l.product_id = ANY(product_ids))
  GROUP BY l.product_id;
END;
$$;

-- Replace products_landing_public view with a secure function
CREATE OR REPLACE FUNCTION public.get_public_products(limit_param integer DEFAULT 20, offset_param integer DEFAULT 0)
RETURNS TABLE(id uuid, title text, status text, created_at timestamp with time zone, category_slug text, brand_id uuid, retailer_id uuid, category_name text, brand_name text, brand_slug text, brand_logo text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER  
SET search_path = public
AS $$
BEGIN
  -- Return basic product info for public browsing
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.status::text,
    p.created_at,
    p.category_slug::text,
    p.brand_id,
    p.retailer_id,
    c.name as category_name,
    b.name as brand_name,
    b.slug as brand_slug,
    b.logo_url as brand_logo
  FROM public.products p
  LEFT JOIN public.categories c ON c.slug = p.category_slug::text AND c.active = true
  LEFT JOIN public.brands b ON b.id = p.brand_id
  LEFT JOIN public.retailers r ON r.id = p.retailer_id
  WHERE p.status = 'active'
  ORDER BY p.created_at DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$$;