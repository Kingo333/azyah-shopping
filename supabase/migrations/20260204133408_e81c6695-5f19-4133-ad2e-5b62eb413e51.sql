-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create function to delete expired AI assets (older than 48 hours)
CREATE OR REPLACE FUNCTION public.delete_expired_ai_assets()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete assets older than 48 hours
  DELETE FROM public.ai_assets
  WHERE created_at < NOW() - INTERVAL '48 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the cleanup
  IF deleted_count > 0 THEN
    RAISE LOG 'Deleted % expired AI assets', deleted_count;
  END IF;
END;
$$;

-- Schedule the cleanup to run every hour
SELECT cron.schedule(
  'delete-expired-ai-assets',
  '0 * * * *', -- Every hour at minute 0
  'SELECT public.delete_expired_ai_assets()'
);

-- Also clean up old video input files from tnb-video-inputs bucket (optional)
-- These are intermediate files used during video generation