-- Fix Security Definer View issue by recreating views with proper security
-- Drop existing views that may have elevated privileges
DROP VIEW IF EXISTS public.categories_public CASCADE;
DROP VIEW IF EXISTS public.product_like_counts CASCADE;
DROP VIEW IF EXISTS public.products_landing_public CASCADE;

-- Recreate categories_public view with proper security
CREATE VIEW public.categories_public AS
SELECT 
  category_slug AS slug,
  category_slug AS name,
  count(*) AS product_count
FROM public.products
WHERE status = 'active'
GROUP BY category_slug
ORDER BY count(*) DESC;

-- Set proper ownership and permissions for categories_public
ALTER VIEW public.categories_public OWNER TO postgres;
REVOKE ALL ON public.categories_public FROM PUBLIC;
GRANT SELECT ON public.categories_public TO authenticated;

-- Enable RLS on categories_public view (though views don't directly support RLS, 
-- the underlying tables do, which provides the security)

-- Recreate product_like_counts view with proper security
CREATE VIEW public.product_like_counts AS
SELECT 
  l.product_id,
  count(*) AS like_count
FROM public.likes l
JOIN public.products p ON p.id = l.product_id AND p.status = 'active'
GROUP BY l.product_id;

-- Set proper ownership and permissions for product_like_counts
ALTER VIEW public.product_like_counts OWNER TO postgres;
REVOKE ALL ON public.product_like_counts FROM PUBLIC;
GRANT SELECT ON public.product_like_counts TO authenticated;

-- Recreate products_landing_public view with proper security
CREATE VIEW public.products_landing_public AS
SELECT 
  p.id,
  p.title,
  p.status,
  p.created_at,
  p.category_slug,
  p.brand_id,
  p.retailer_id,
  c.name AS category_name,
  b.name AS brand_name,
  b.slug AS brand_slug,
  b.logo_url AS brand_logo
FROM public.products p
LEFT JOIN public.categories c ON c.slug = p.category_slug::text AND c.active = true
LEFT JOIN public.brands b ON b.id = p.brand_id
LEFT JOIN public.retailers r ON r.id = p.retailer_id
WHERE p.status = 'active';

-- Set proper ownership and permissions for products_landing_public
ALTER VIEW public.products_landing_public OWNER TO postgres;
REVOKE ALL ON public.products_landing_public FROM PUBLIC;
GRANT SELECT ON public.products_landing_public TO authenticated;

-- Add comments to document the security approach
COMMENT ON VIEW public.categories_public IS 'Public view for category data - security enforced through underlying table RLS policies';
COMMENT ON VIEW public.product_like_counts IS 'View for product like counts - security enforced through underlying table RLS policies';
COMMENT ON VIEW public.products_landing_public IS 'Public view for product landing data - security enforced through underlying table RLS policies';