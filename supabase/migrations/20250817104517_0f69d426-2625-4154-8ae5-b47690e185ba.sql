-- Fix the get_fallback_trending_categories function with proper aliasing
CREATE OR REPLACE FUNCTION public.get_fallback_trending_categories(limit_count integer DEFAULT 20)
RETURNS TABLE(category_slug category_type, subcategory_slug subcategory_type, product_count bigint, recent_products jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    products_with_rank.category_slug,
    products_with_rank.subcategory_slug,
    COUNT(*) as product_count,
    jsonb_agg(
      jsonb_build_object(
        'id', products_with_rank.id,
        'title', products_with_rank.title,
        'image_url', COALESCE(products_with_rank.image_url, 
                             CASE 
                               WHEN jsonb_array_length(products_with_rank.media_urls) > 0 
                               THEN products_with_rank.media_urls->0->>0
                               ELSE '/placeholder.svg'
                             END),
        'price_cents', products_with_rank.price_cents,
        'currency', products_with_rank.currency
      ) ORDER BY products_with_rank.created_at DESC
    ) FILTER (WHERE products_with_rank.rn <= 3) as recent_products
  FROM (
    SELECT 
      p.id,
      p.title,
      p.image_url,
      p.media_urls,
      p.price_cents,
      p.currency,
      p.category_slug,
      p.subcategory_slug,
      p.created_at,
      ROW_NUMBER() OVER (PARTITION BY p.category_slug, p.subcategory_slug ORDER BY p.created_at DESC) as rn
    FROM products p
    WHERE p.status = 'active'
  ) products_with_rank
  WHERE products_with_rank.rn <= 3
  GROUP BY products_with_rank.category_slug, products_with_rank.subcategory_slug
  HAVING COUNT(*) >= 3
  ORDER BY product_count DESC
  LIMIT limit_count;
END;
$function$;