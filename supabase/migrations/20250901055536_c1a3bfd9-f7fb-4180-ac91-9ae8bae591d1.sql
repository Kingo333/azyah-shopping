-- Create function to get similar products based on category, brand, and price
CREATE OR REPLACE FUNCTION public.get_similar_products(
  target_product_id uuid,
  limit_count integer DEFAULT 12,
  offset_count integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  title text,
  price_cents integer,
  currency text,
  brand_id uuid,
  category_slug category_type,
  subcategory_slug subcategory_type,
  media_urls jsonb,
  image_url text,
  external_url text,
  brand jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  target_product RECORD;
  price_min integer;
  price_max integer;
BEGIN
  -- Get target product info
  SELECT p.category_slug, p.subcategory_slug, p.price_cents, p.brand_id
  INTO target_product
  FROM products p
  WHERE p.id = target_product_id AND p.status = 'active';
  
  IF target_product IS NULL THEN
    RETURN;
  END IF;
  
  -- Calculate price range (±30%)
  price_min := (target_product.price_cents * 0.7)::integer;
  price_max := (target_product.price_cents * 1.3)::integer;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.price_cents,
    p.currency,
    p.brand_id,
    p.category_slug,
    p.subcategory_slug,
    p.media_urls,
    p.image_url,
    p.external_url,
    jsonb_build_object(
      'id', b.id,
      'name', b.name,
      'slug', b.slug
    ) as brand
  FROM products p
  LEFT JOIN brands b ON b.id = p.brand_id
  WHERE p.status = 'active'
    AND p.id != target_product_id
    AND p.price_cents BETWEEN price_min AND price_max
    AND (
      -- Same category and subcategory (highest priority)
      (p.category_slug = target_product.category_slug AND p.subcategory_slug = target_product.subcategory_slug)
      OR
      -- Same category, different subcategory (medium priority)  
      (p.category_slug = target_product.category_slug AND p.subcategory_slug != target_product.subcategory_slug)
      OR
      -- Same brand (medium priority)
      (p.brand_id = target_product.brand_id)
    )
  ORDER BY 
    -- Prioritize same category + subcategory
    CASE 
      WHEN p.category_slug = target_product.category_slug AND p.subcategory_slug = target_product.subcategory_slug THEN 1
      WHEN p.category_slug = target_product.category_slug THEN 2
      WHEN p.brand_id = target_product.brand_id THEN 3
      ELSE 4
    END,
    -- Secondary sort by price similarity
    ABS(p.price_cents - target_product.price_cents),
    -- Randomize within similar groups
    RANDOM()
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;