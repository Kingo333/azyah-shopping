-- Search run tracking for deals-unified pipeline
CREATE TABLE IF NOT EXISTS deals_search_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  source TEXT NOT NULL,
  input_image_url TEXT,
  page_url TEXT,
  market TEXT DEFAULT 'AE',
  ximilar_tags JSONB,
  query_hint TEXT,
  results_count INT,
  exact_match_found BOOLEAN DEFAULT FALSE,
  pipeline_timing_ms JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE deals_search_runs ENABLE ROW LEVEL SECURITY;

-- Users can view their own search runs
CREATE POLICY "Users can view own search runs" 
ON deals_search_runs FOR SELECT 
USING (auth.uid() = user_id);

-- Service role can insert (edge function uses service role)
CREATE POLICY "Service can insert search runs" 
ON deals_search_runs FOR INSERT 
WITH CHECK (true);

-- Index for user lookups
CREATE INDEX idx_deals_search_runs_user ON deals_search_runs(user_id, created_at DESC);