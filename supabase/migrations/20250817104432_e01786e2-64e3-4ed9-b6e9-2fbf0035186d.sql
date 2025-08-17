-- Fix the get_fallback_trending_categories function
CREATE OR REPLACE FUNCTION public.get_fallback_trending_categories(limit_count integer DEFAULT 20)
RETURNS TABLE(category_slug category_type, subcategory_slug subcategory_type, product_count bigint, recent_products jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.category_slug,
    p.subcategory_slug,
    COUNT(*) as product_count,
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'title', p.title,
        'image_url', p.image_url,
        'price_cents', p.price_cents,
        'currency', p.currency
      ) ORDER BY p.created_at DESC
    ) FILTER (WHERE rn <= 3) as recent_products
  FROM (
    SELECT *,
      ROW_NUMBER() OVER (PARTITION BY category_slug, subcategory_slug ORDER BY created_at DESC) as rn
    FROM products
    WHERE status = 'active'
  ) p
  WHERE rn <= 3
  GROUP BY p.category_slug, p.subcategory_slug
  HAVING COUNT(*) >= 3
  ORDER BY product_count DESC
  LIMIT limit_count;
END;
$function$;