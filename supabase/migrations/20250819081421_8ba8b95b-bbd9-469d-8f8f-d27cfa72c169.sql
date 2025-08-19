-- Check for SECURITY DEFINER views
SELECT schemaname, viewname, viewowner, definition 
FROM pg_views 
WHERE schemaname = 'public' 
AND definition ILIKE '%SECURITY DEFINER%';