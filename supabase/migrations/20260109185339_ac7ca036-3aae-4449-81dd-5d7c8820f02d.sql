-- Update the log_style_link_event function to exclude self-views
CREATE OR REPLACE FUNCTION public.log_style_link_event(
  username_param TEXT,
  event_type_param TEXT,
  target_slug_param TEXT DEFAULT NULL,
  referrer_url_param TEXT DEFAULT NULL,
  metadata_param JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id UUID;
  current_user_id UUID;
BEGIN
  -- Get the current authenticated user (if any)
  current_user_id := auth.uid();
  
  -- Resolve owner user_id from username (prevents spoofing)
  SELECT u.id INTO owner_id
  FROM users u
  WHERE u.username = username_param
  LIMIT 1;
  
  -- Only insert if we found a valid user AND the viewer is not the owner
  -- This excludes the owner from their own view statistics
  IF owner_id IS NOT NULL AND (current_user_id IS NULL OR current_user_id != owner_id) THEN
    INSERT INTO style_link_analytics (owner_user_id, event_type, target_slug, referrer_url, metadata)
    VALUES (owner_id, event_type_param, target_slug_param, referrer_url_param, metadata_param);
  END IF;
END;
$$;