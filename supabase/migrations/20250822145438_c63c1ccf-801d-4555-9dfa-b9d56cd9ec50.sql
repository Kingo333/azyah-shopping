-- Create function to cleanup old AI assets (older than 48 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_ai_assets()
RETURNS TABLE(
  deleted_assets_count INTEGER,
  deleted_jobs_count INTEGER,
  deleted_files_count INTEGER,
  cleanup_summary TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cutoff_time TIMESTAMP WITH TIME ZONE;
  assets_deleted INTEGER := 0;
  jobs_deleted INTEGER := 0;
  files_to_delete TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Calculate cutoff time (48 hours ago)
  cutoff_time := NOW() - INTERVAL '48 hours';
  
  -- Log the cleanup start
  RAISE LOG 'Starting AI assets cleanup for records older than %', cutoff_time;
  
  -- Collect asset URLs that will be deleted for storage cleanup
  SELECT ARRAY_AGG(asset_url) INTO files_to_delete
  FROM ai_assets 
  WHERE created_at < cutoff_time;
  
  -- Delete old AI assets
  DELETE FROM public.ai_assets 
  WHERE created_at < cutoff_time;
  
  GET DIAGNOSTICS assets_deleted = ROW_COUNT;
  RAISE LOG 'Deleted % old ai_assets records', assets_deleted;
  
  -- Delete old AI try-on jobs
  DELETE FROM public.ai_tryon_jobs 
  WHERE created_at < cutoff_time;
  
  GET DIAGNOSTICS jobs_deleted = ROW_COUNT;
  RAISE LOG 'Deleted % old ai_tryon_jobs records', jobs_deleted;
  
  -- Return cleanup results
  RETURN QUERY SELECT 
    assets_deleted,
    jobs_deleted,
    COALESCE(ARRAY_LENGTH(files_to_delete, 1), 0),
    FORMAT('Cleanup completed: %s assets, %s jobs, %s files identified for deletion at %s', 
           assets_deleted, jobs_deleted, COALESCE(ARRAY_LENGTH(files_to_delete, 1), 0), NOW());
           
  -- Log completion
  RAISE LOG 'AI assets cleanup completed: % assets, % jobs deleted', assets_deleted, jobs_deleted;
END;
$$;

-- Create function to get cleanup statistics
CREATE OR REPLACE FUNCTION public.get_cleanup_stats()
RETURNS TABLE(
  total_assets INTEGER,
  assets_eligible_for_cleanup INTEGER,
  total_jobs INTEGER,
  jobs_eligible_for_cleanup INTEGER,
  next_cleanup_estimate TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cutoff_time TIMESTAMP WITH TIME ZONE;
BEGIN
  cutoff_time := NOW() - INTERVAL '48 hours';
  
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM ai_assets),
    (SELECT COUNT(*)::INTEGER FROM ai_assets WHERE created_at < cutoff_time),
    (SELECT COUNT(*)::INTEGER FROM ai_tryon_jobs),
    (SELECT COUNT(*)::INTEGER FROM ai_tryon_jobs WHERE created_at < cutoff_time),
    FORMAT('Next cleanup will remove records older than %s', cutoff_time);
END;
$$;