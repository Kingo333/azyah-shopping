
-- 1) Extend products with additive columns (safe, non-breaking)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS external_source text,
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS price_raw text,
  ADD COLUMN IF NOT EXISTS merchant_name text,
  ADD COLUMN IF NOT EXISTS category_guess text[],
  ADD COLUMN IF NOT EXISTS is_partner_item boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS affiliate_url text;

-- Backfill source_url from external_url for existing rows
UPDATE public.products
SET source_url = external_url
WHERE source_url IS NULL AND external_url IS NOT NULL;

-- Ensure existing manual items are treated as partners
UPDATE public.products
SET is_partner_item = true
WHERE external_source IS NULL;

-- Index for external source
CREATE INDEX IF NOT EXISTS idx_products_external_source
  ON public.products (external_source);

-- Unique dedupe key for external ingest (skip NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_products_external_source_id
  ON public.products (external_source, external_id)
  WHERE external_source IS NOT NULL AND external_id IS NOT NULL;

-- 2) Create ingest_runs table for observability
CREATE TABLE IF NOT EXISTS public.ingest_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'serper',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  attempted integer NOT NULL DEFAULT 0,
  inserted integer NOT NULL DEFAULT 0,
  updated integer NOT NULL DEFAULT 0,
  rejected integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  notes jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- RLS: enabled and limited to admins
ALTER TABLE public.ingest_runs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ingest_runs' AND policyname = 'Admins can view ingest runs'
  ) THEN
    CREATE POLICY "Admins can view ingest runs"
      ON public.ingest_runs
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.users
          WHERE users.id = auth.uid() AND users.role = 'admin'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ingest_runs' AND policyname = 'Admins can manage ingest runs'
  ) THEN
    CREATE POLICY "Admins can manage ingest runs"
      ON public.ingest_runs
      FOR ALL
      USING (
        EXISTS (
          SELECT 1
          FROM public.users
          WHERE users.id = auth.uid() AND users.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.users
          WHERE users.id = auth.uid() AND users.role = 'admin'
        )
      );
  END IF;
END$$;
