-- Create deals_cache table for caching SerpApi results
CREATE TABLE IF NOT EXISTS public.deals_cache (
  key TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create index for cache expiration cleanup
CREATE INDEX IF NOT EXISTS idx_deals_cache_expires_at ON public.deals_cache(expires_at);

-- Enable RLS
ALTER TABLE public.deals_cache ENABLE ROW LEVEL SECURITY;

-- Only service role can access cache (no user access needed)
-- No RLS policies needed as this is server-side only

-- Create deals_rate_limit table for per-user rate limiting
CREATE TABLE IF NOT EXISTS public.deals_rate_limit (
  user_id UUID NOT NULL,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, window_start)
);

-- Create index for cleanup
CREATE INDEX IF NOT EXISTS idx_deals_rate_limit_window ON public.deals_rate_limit(window_start);

-- Enable RLS
ALTER TABLE public.deals_rate_limit ENABLE ROW LEVEL SECURITY;

-- Only service role can access rate limit table (no user access needed)
-- No RLS policies needed as this is server-side only

-- Create function to clean up expired cache entries (can be called by cron)
CREATE OR REPLACE FUNCTION public.cleanup_deals_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.deals_cache WHERE expires_at < now();
  DELETE FROM public.deals_rate_limit WHERE window_start < now() - INTERVAL '5 minutes';
END;
$$;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION public.cleanup_deals_cache() TO service_role;