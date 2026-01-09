-- Fix ensure_username_for_user to try clean base first (no random suffix)
CREATE OR REPLACE FUNCTION public.ensure_username_for_user(target_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_username text;
  v_name text;
  v_email text;
  v_base_slug text;
  v_candidate text;
  v_suffix int := 1;
BEGIN
  -- Check if user already has a username
  SELECT username, name INTO v_current_username, v_name
  FROM public.users WHERE id = target_user_id;
  
  IF v_current_username IS NOT NULL THEN
    RETURN v_current_username;
  END IF;
  
  -- Get email as fallback
  SELECT email INTO v_email FROM auth.users WHERE id = target_user_id;
  
  -- Build base slug from name, email prefix, or default
  IF v_name IS NOT NULL AND LENGTH(TRIM(v_name)) > 0 THEN
    v_base_slug := LOWER(REGEXP_REPLACE(TRIM(v_name), '\s+', '_', 'g'));
    v_base_slug := REGEXP_REPLACE(v_base_slug, '[^a-z0-9_]', '', 'g');
    v_base_slug := REGEXP_REPLACE(v_base_slug, '_+', '_', 'g');
    v_base_slug := TRIM(BOTH '_' FROM v_base_slug);
    v_base_slug := LEFT(v_base_slug, 20);
  ELSIF v_email IS NOT NULL THEN
    v_base_slug := LOWER(SPLIT_PART(v_email, '@', 1));
    v_base_slug := REGEXP_REPLACE(v_base_slug, '[^a-z0-9_]', '', 'g');
    v_base_slug := LEFT(v_base_slug, 20);
  END IF;
  
  IF v_base_slug IS NULL OR LENGTH(v_base_slug) < 2 THEN
    v_base_slug := 'user';
  END IF;
  
  -- TRY CLEAN BASE FIRST (no suffix!)
  v_candidate := v_base_slug;
  
  -- Only add numeric suffix if collision exists (2, 3, 4...)
  WHILE EXISTS (SELECT 1 FROM public.users WHERE LOWER(username) = LOWER(v_candidate)) AND v_suffix < 100 LOOP
    v_suffix := v_suffix + 1;
    v_candidate := v_base_slug || v_suffix::text;
  END LOOP;
  
  -- Update user with generated username
  UPDATE public.users 
  SET username = v_candidate, updated_at = NOW()
  WHERE id = target_user_id AND username IS NULL;
  
  RETURN v_candidate;
END;
$$;

-- Clean existing usernames: remove _xxxxxx UUID suffixes
UPDATE public.users
SET username = REGEXP_REPLACE(username, '_[a-f0-9]{6}[0-9]*$', '', 'g'),
    updated_at = NOW()
WHERE username ~ '_[a-f0-9]{6}[0-9]*$';

-- Sync changes to public_profiles table
UPDATE public.public_profiles pp
SET username = u.username
FROM public.users u
WHERE pp.id = u.id AND (pp.username IS DISTINCT FROM u.username);