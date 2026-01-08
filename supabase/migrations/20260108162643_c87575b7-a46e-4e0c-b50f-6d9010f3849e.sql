-- =============================================================================
-- PHASE 1: Create admin RPC for username generation (single source of truth)
-- =============================================================================

-- Admin-level username generator that can be called for any user
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
  v_suffix int := 0;
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
    -- Replace spaces with underscores, keep alphanumeric and underscores
    v_base_slug := LOWER(REGEXP_REPLACE(TRIM(v_name), '\s+', '_', 'g'));
    v_base_slug := REGEXP_REPLACE(v_base_slug, '[^a-z0-9_]', '', 'g');
    -- Collapse multiple underscores
    v_base_slug := REGEXP_REPLACE(v_base_slug, '_+', '_', 'g');
    -- Trim underscores from ends
    v_base_slug := TRIM(BOTH '_' FROM v_base_slug);
    v_base_slug := LEFT(v_base_slug, 15);
  ELSIF v_email IS NOT NULL THEN
    -- Use email prefix
    v_base_slug := LOWER(SPLIT_PART(v_email, '@', 1));
    v_base_slug := REGEXP_REPLACE(v_base_slug, '[^a-z0-9_]', '', 'g');
    v_base_slug := LEFT(v_base_slug, 15);
  END IF;
  
  -- Fallback if still empty or too short
  IF v_base_slug IS NULL OR LENGTH(v_base_slug) < 2 THEN
    v_base_slug := 'user';
  END IF;
  
  -- Generate candidate with user ID suffix for uniqueness
  v_candidate := v_base_slug || '_' || LEFT(target_user_id::text, 6);
  
  -- Find unique username (loop with max 50 iterations)
  WHILE EXISTS (SELECT 1 FROM public.users WHERE LOWER(username) = LOWER(v_candidate)) AND v_suffix < 50 LOOP
    v_suffix := v_suffix + 1;
    v_candidate := v_base_slug || '_' || LEFT(target_user_id::text, 6) || v_suffix::text;
  END LOOP;
  
  -- Update user with generated username
  UPDATE public.users 
  SET username = v_candidate, updated_at = NOW()
  WHERE id = target_user_id AND username IS NULL;
  
  RETURN v_candidate;
END;
$$;

-- Update ensure_my_username to use the same logic (calls admin version)
CREATE OR REPLACE FUNCTION public.ensure_my_username()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN ensure_username_for_user(auth.uid());
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.ensure_username_for_user(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.ensure_my_username() TO authenticated;

-- =============================================================================
-- PHASE 2: Update handle_new_user trigger (safer COALESCE updates)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  detected_role text;
  detected_provider text;
  user_name text;
  user_avatar text;
BEGIN
  -- Extract role and provider
  detected_role := COALESCE(NEW.raw_user_meta_data->>'role', 'shopper');
  detected_provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');
  
  -- Extract name from auth metadata (multiple possible keys)
  user_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), '')
  );
  
  -- Extract avatar from auth metadata
  user_avatar := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'avatar_url'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'picture'), '')
  );
  
  -- Insert user record - only update NULL fields on conflict (safe pattern)
  INSERT INTO public.users (id, email, role, provider, name, avatar_url, onboarding_completed, created_at, updated_at)
  VALUES (
    NEW.id, 
    NEW.email, 
    detected_role::user_role, 
    detected_provider, 
    user_name, 
    user_avatar, 
    false, 
    NOW(), 
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    -- Only update if existing value is NULL (preserve existing data)
    email = COALESCE(users.email, EXCLUDED.email),
    provider = COALESCE(users.provider, EXCLUDED.provider),
    role = COALESCE(users.role, EXCLUDED.role),
    name = COALESCE(users.name, EXCLUDED.name),
    avatar_url = COALESCE(users.avatar_url, EXCLUDED.avatar_url),
    updated_at = NOW();
  
  -- Copy default wardrobe items for shoppers
  IF detected_role = 'shopper' THEN
    PERFORM copy_default_wardrobe_items(NEW.id);
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user trigger: % %', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- =============================================================================
-- PHASE 3: One-time backfill migration
-- =============================================================================

-- Step 3A: Backfill name from auth metadata with proper fallbacks
UPDATE public.users u
SET 
  name = COALESCE(
    -- Try auth metadata first
    NULLIF(TRIM((SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = u.id)), ''),
    NULLIF(TRIM((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = u.id)), ''),
    NULLIF(TRIM((SELECT raw_user_meta_data->>'display_name' FROM auth.users WHERE id = u.id)), ''),
    -- Fallback to prettified email prefix
    INITCAP(REPLACE(SPLIT_PART(u.email, '@', 1), '.', ' ')),
    -- Final fallback to User + id prefix
    'User ' || LEFT(u.id::text, 6)
  ),
  updated_at = NOW()
WHERE u.name IS NULL;

-- Step 3B: Backfill avatar_url from auth metadata where NULL
UPDATE public.users u
SET 
  avatar_url = COALESCE(
    NULLIF(TRIM((SELECT raw_user_meta_data->>'avatar_url' FROM auth.users WHERE id = u.id)), ''),
    NULLIF(TRIM((SELECT raw_user_meta_data->>'picture' FROM auth.users WHERE id = u.id)), '')
  ),
  updated_at = NOW()
WHERE u.avatar_url IS NULL
  AND EXISTS (
    SELECT 1 FROM auth.users a 
    WHERE a.id = u.id 
    AND (a.raw_user_meta_data->>'avatar_url' IS NOT NULL OR a.raw_user_meta_data->>'picture' IS NOT NULL)
  );

-- Step 3C: Backfill usernames using the single-source-of-truth RPC
DO $$
DECLARE
  user_record RECORD;
  generated_username TEXT;
BEGIN
  FOR user_record IN 
    SELECT id FROM public.users WHERE username IS NULL
  LOOP
    generated_username := ensure_username_for_user(user_record.id);
    RAISE NOTICE 'Generated username % for user %', generated_username, user_record.id;
  END LOOP;
END $$;