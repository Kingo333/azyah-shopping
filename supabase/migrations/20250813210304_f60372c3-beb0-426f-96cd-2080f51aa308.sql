-- Create import sources table
CREATE TABLE public.import_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  domain TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
  last_crawl_at TIMESTAMP WITH TIME ZONE,
  crawl_strategy TEXT NOT NULL DEFAULT 'sitemap' CHECK (crawl_strategy IN ('sitemap', 'listpage', 'mixed')),
  robots_allowed BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create import jobs table
CREATE TABLE public.import_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID NOT NULL REFERENCES public.import_sources(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE,
  pages_crawled INTEGER DEFAULT 0,
  products_extracted INTEGER DEFAULT 0,
  products_imported INTEGER DEFAULT 0,
  error_log TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create import products staging table
CREATE TABLE public.import_products_staging (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.import_jobs(id) ON DELETE CASCADE,
  external_url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER,
  currency TEXT DEFAULT 'USD',
  images JSONB DEFAULT '[]'::jsonb,
  extracted_data JSONB DEFAULT '{}'::jsonb,
  suggested_category category_type,
  suggested_subcategory subcategory_type,
  suggested_attributes JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'imported')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.import_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_products_staging ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for import_sources
CREATE POLICY "Users can manage their own import sources"
ON public.import_sources
FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own import sources"
ON public.import_sources
FOR SELECT
USING (auth.uid() = user_id);

-- Create RLS policies for import_jobs
CREATE POLICY "Users can view their own import jobs"
ON public.import_jobs
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.import_sources 
  WHERE import_sources.id = import_jobs.source_id 
  AND import_sources.user_id = auth.uid()
));

CREATE POLICY "Users can manage their own import jobs"
ON public.import_jobs
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.import_sources 
  WHERE import_sources.id = import_jobs.source_id 
  AND import_sources.user_id = auth.uid()
));

-- Create RLS policies for import_products_staging
CREATE POLICY "Users can view their own staged products"
ON public.import_products_staging
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.import_jobs 
  JOIN public.import_sources ON import_sources.id = import_jobs.source_id
  WHERE import_jobs.id = import_products_staging.job_id 
  AND import_sources.user_id = auth.uid()
));

CREATE POLICY "Users can manage their own staged products"
ON public.import_products_staging
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.import_jobs 
  JOIN public.import_sources ON import_sources.id = import_jobs.source_id
  WHERE import_jobs.id = import_products_staging.job_id 
  AND import_sources.user_id = auth.uid()
));

-- Create triggers for updated_at
CREATE TRIGGER update_import_sources_updated_at
  BEFORE UPDATE ON public.import_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_import_products_staging_updated_at
  BEFORE UPDATE ON public.import_products_staging
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_import_sources_user_id ON public.import_sources(user_id);
CREATE INDEX idx_import_sources_domain ON public.import_sources(domain);
CREATE INDEX idx_import_jobs_source_id ON public.import_jobs(source_id);
CREATE INDEX idx_import_jobs_status ON public.import_jobs(status);
CREATE INDEX idx_import_products_staging_job_id ON public.import_products_staging(job_id);
CREATE INDEX idx_import_products_staging_status ON public.import_products_staging(status);