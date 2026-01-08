-- Phase 1: Fix Style Link identifier resolution + collision-safe username generation

-- 1. Create unique index on lowercase username for collision safety
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_unique
ON public.users (LOWER(username))
WHERE username IS NOT NULL;

-- 2. Drop and recreate get_user_style_link_data to accept identifier (UUID or username)
DROP FUNCTION IF EXISTS public.get_user_style_link_data(TEXT);

CREATE OR REPLACE FUNCTION public.get_user_style_link_data(identifier_param TEXT)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  name TEXT,
  avatar_url TEXT,
  bio TEXT,
  referral_code TEXT,
  socials JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  viewer_id UUID;
  is_uuid BOOLEAN;
BEGIN
  viewer_id := auth.uid();
  
  -- Check if identifier looks like a UUID (standard UUID format)
  is_uuid := identifier_param ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
  
  RETURN QUERY
  SELECT 
    u.id AS user_id,
    u.username,
    u.name,
    u.avatar_url,
    u.bio,
    -- Only return referral_code to the owner
    CASE WHEN viewer_id = u.id THEN u.referral_code ELSE NULL END AS referral_code,
    u.socials
  FROM users u
  WHERE 
    CASE 
      WHEN is_uuid THEN u.id = identifier_param::UUID
      ELSE LOWER(u.username) = LOWER(identifier_param)
    END
  LIMIT 1;
END;
$$;

-- 3. Create sync_my_profile_from_auth - backfills name/avatar from auth metadata
CREATE OR REPLACE FUNCTION public.sync_my_profile_from_auth()
RETURNS TABLE (
  synced_name TEXT,
  synced_avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_auth_meta JSONB;
  v_current_name TEXT;
  v_current_avatar TEXT;
  v_auth_name TEXT;
  v_auth_avatar TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get current values from public.users
  SELECT u.name, u.avatar_url INTO v_current_name, v_current_avatar
  FROM users u WHERE u.id = v_user_id;
  
  -- Get auth metadata
  SELECT raw_user_meta_data INTO v_auth_meta
  FROM auth.users WHERE id = v_user_id;
  
  v_auth_name := COALESCE(
    v_auth_meta->>'name',
    v_auth_meta->>'full_name',
    v_auth_meta->>'display_name'
  );
  v_auth_avatar := COALESCE(
    v_auth_meta->>'avatar_url',
    v_auth_meta->>'picture'
  );
  
  -- Update only NULL fields
  UPDATE users
  SET 
    name = COALESCE(name, v_auth_name),
    avatar_url = COALESCE(avatar_url, v_auth_avatar),
    updated_at = NOW()
  WHERE id = v_user_id
    AND (name IS NULL OR avatar_url IS NULL);
  
  -- Return final values
  SELECT u.name, u.avatar_url INTO synced_name, synced_avatar_url
  FROM users u WHERE u.id = v_user_id;
  
  RETURN NEXT;
END;
$$;

-- 4. Create ensure_my_username - collision-safe username generation
CREATE OR REPLACE FUNCTION public.ensure_my_username()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_current_username TEXT;
  v_name TEXT;
  v_base_slug TEXT;
  v_candidate TEXT;
  v_suffix INT := 0;
  v_max_attempts INT := 20;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user already has a username
  SELECT username, name INTO v_current_username, v_name
  FROM users WHERE id = v_user_id;
  
  IF v_current_username IS NOT NULL THEN
    RETURN v_current_username;
  END IF;
  
  -- Generate base slug from name or user id
  IF v_name IS NOT NULL AND LENGTH(TRIM(v_name)) > 0 THEN
    v_base_slug := LOWER(REGEXP_REPLACE(v_name, '[^a-zA-Z0-9]', '', 'g'));
    v_base_slug := LEFT(v_base_slug, 12);
  ELSE
    v_base_slug := 'user';
  END IF;
  
  -- If base slug is empty, use 'user'
  IF v_base_slug IS NULL OR LENGTH(v_base_slug) = 0 THEN
    v_base_slug := 'user';
  END IF;
  
  -- Add short user id suffix for uniqueness
  v_candidate := v_base_slug || '_' || LEFT(v_user_id::TEXT, 6);
  
  -- Loop until we find a unique username
  WHILE v_suffix < v_max_attempts LOOP
    -- Check if this username exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE LOWER(username) = LOWER(v_candidate)) THEN
      -- Found unique username, update and return
      UPDATE users 
      SET username = v_candidate, updated_at = NOW()
      WHERE id = v_user_id;
      
      RETURN v_candidate;
    END IF;
    
    -- Collision, try next suffix
    v_suffix := v_suffix + 1;
    v_candidate := v_base_slug || '_' || LEFT(v_user_id::TEXT, 6) || v_suffix::TEXT;
  END LOOP;
  
  -- Fallback: use full UUID prefix
  v_candidate := 'u_' || LEFT(REPLACE(v_user_id::TEXT, '-', ''), 12);
  
  UPDATE users 
  SET username = v_candidate, updated_at = NOW()
  WHERE id = v_user_id;
  
  RETURN v_candidate;
END;
$$;