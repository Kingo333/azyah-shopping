-- Rollback ingestion-related artifacts introduced by recent changes
-- 1) Drop ingest_runs table (policies are dropped automatically)
DROP TABLE IF EXISTS public.ingest_runs;

-- 2) Drop ingestion-specific indexes on products (handle multiple possible names)
DROP INDEX IF EXISTS public.idx_products_external_source;
DROP INDEX IF EXISTS public.idx_products_is_partner_item;
DROP INDEX IF EXISTS public.uniq_products_external_source_id;
DROP INDEX IF EXISTS public.uq_products_external_pair;

-- 3) Drop additive ingestion columns from products
-- Keeping image_url, price_raw, and merchant_name to avoid breaking existing UI features
ALTER TABLE public.products
  DROP COLUMN IF EXISTS external_source,
  DROP COLUMN IF EXISTS external_id,
  DROP COLUMN IF EXISTS source_url,
  DROP COLUMN IF EXISTS category_guess,
  DROP COLUMN IF EXISTS is_partner_item,
  DROP COLUMN IF EXISTS affiliate_url;