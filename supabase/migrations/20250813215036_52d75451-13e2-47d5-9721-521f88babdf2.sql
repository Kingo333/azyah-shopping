-- Enhance import_sources table with safe scraping fields
ALTER TABLE import_sources ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT FALSE;
ALTER TABLE import_sources ADD COLUMN IF NOT EXISTS robots_allowed BOOLEAN DEFAULT TRUE;
ALTER TABLE import_sources ADD COLUMN IF NOT EXISTS rate_limit_rps NUMERIC DEFAULT 1.0;
ALTER TABLE import_sources ADD COLUMN IF NOT EXISTS max_concurrent INTEGER DEFAULT 3;
ALTER TABLE import_sources ADD COLUMN IF NOT EXISTS respect_robots BOOLEAN DEFAULT TRUE;
ALTER TABLE import_sources ADD COLUMN IF NOT EXISTS last_robots_check TIMESTAMP WITH TIME ZONE;
ALTER TABLE import_sources ADD COLUMN IF NOT EXISTS owner_contact TEXT;
ALTER TABLE import_sources ADD COLUMN IF NOT EXISTS crawl_settings JSONB DEFAULT '{"maxDepth": 2, "maxUrls": 500, "politeDelay": 1000}'::jsonb;

-- Create robots_cache table for caching robots.txt data
CREATE TABLE IF NOT EXISTS robots_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain TEXT NOT NULL UNIQUE,
    robots_content TEXT,
    last_fetched TIMESTAMP WITH TIME ZONE DEFAULT now(),
    allows_crawling BOOLEAN DEFAULT true,
    user_agent_checked TEXT DEFAULT '*',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create crawl_sessions table for tracking individual crawl attempts
CREATE TABLE IF NOT EXISTS crawl_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES import_sources(id) ON DELETE CASCADE,
    job_id UUID REFERENCES import_jobs(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    status TEXT DEFAULT 'running', -- 'running', 'completed', 'failed', 'rate_limited', 'blocked'
    urls_discovered INTEGER DEFAULT 0,
    urls_processed INTEGER DEFAULT 0,
    urls_failed INTEGER DEFAULT 0,
    rate_limit_hits INTEGER DEFAULT 0,
    last_request_at TIMESTAMP WITH TIME ZONE,
    backoff_until TIMESTAMP WITH TIME ZONE,
    error_details JSONB DEFAULT '{}'::jsonb,
    session_metrics JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_robots_cache_domain ON robots_cache(domain);
CREATE INDEX IF NOT EXISTS idx_crawl_sessions_source_id ON crawl_sessions(source_id);
CREATE INDEX IF NOT EXISTS idx_crawl_sessions_job_id ON crawl_sessions(job_id);
CREATE INDEX IF NOT EXISTS idx_crawl_sessions_status ON crawl_sessions(status);

-- Enable RLS on new tables
ALTER TABLE robots_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for robots_cache (shared read, admin write)
CREATE POLICY "Anyone can view robots cache" ON robots_cache FOR SELECT USING (true);
CREATE POLICY "Service can manage robots cache" ON robots_cache FOR ALL USING (true);

-- RLS policies for crawl_sessions
CREATE POLICY "Users can view their crawl sessions" ON crawl_sessions FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM import_sources 
    WHERE import_sources.id = crawl_sessions.source_id 
    AND import_sources.user_id = auth.uid()
));

CREATE POLICY "Users can manage their crawl sessions" ON crawl_sessions FOR ALL 
USING (EXISTS (
    SELECT 1 FROM import_sources 
    WHERE import_sources.id = crawl_sessions.source_id 
    AND import_sources.user_id = auth.uid()
));

-- Create function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_robots_cache_updated_at 
    BEFORE UPDATE ON robots_cache 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crawl_sessions_updated_at 
    BEFORE UPDATE ON crawl_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();