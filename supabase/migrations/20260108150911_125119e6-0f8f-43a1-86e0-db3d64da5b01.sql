-- Phase 5: Add affiliate_url column to wardrobe_items
ALTER TABLE public.wardrobe_items ADD COLUMN IF NOT EXISTS affiliate_url TEXT;

-- Phase 6: Create style_link_analytics table for tracking
CREATE TABLE IF NOT EXISTS public.style_link_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  target_slug TEXT,
  referrer_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_style_link_analytics_owner ON public.style_link_analytics(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_style_link_analytics_created ON public.style_link_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_style_link_analytics_event_type ON public.style_link_analytics(event_type);

-- Enable RLS
ALTER TABLE public.style_link_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only owner can read their own analytics
CREATE POLICY "Users can read own style link analytics"
  ON public.style_link_analytics FOR SELECT
  USING (owner_user_id = auth.uid());

-- Create SECURITY DEFINER RPC for safe event logging
-- This allows anonymous/authenticated users to log events without direct table access
CREATE OR REPLACE FUNCTION public.log_style_link_event(
  username_param TEXT,
  event_type_param TEXT,
  target_slug_param TEXT DEFAULT NULL,
  referrer_url_param TEXT DEFAULT NULL,
  metadata_param JSONB DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id UUID;
BEGIN
  -- Resolve owner user_id from username (prevents spoofing)
  SELECT u.id INTO owner_id
  FROM users u
  WHERE u.username = username_param
  LIMIT 1;
  
  -- Only insert if we found a valid user
  IF owner_id IS NOT NULL THEN
    INSERT INTO style_link_analytics (owner_user_id, event_type, target_slug, referrer_url, metadata)
    VALUES (owner_id, event_type_param, target_slug_param, referrer_url_param, metadata_param);
  END IF;
END;
$$;

-- Grant execute permissions to both anon and authenticated users
GRANT EXECUTE ON FUNCTION public.log_style_link_event TO anon, authenticated;

-- Create RPC to get user style link data (public-safe fields only)
CREATE OR REPLACE FUNCTION public.get_user_style_link_data(username_param TEXT)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  name TEXT,
  avatar_url TEXT,
  bio TEXT,
  referral_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  viewer_id UUID;
  target_user_id UUID;
BEGIN
  -- Get the current viewer's ID (NULL if anonymous)
  viewer_id := auth.uid();
  
  -- Get the target user's ID
  SELECT u.id INTO target_user_id
  FROM users u
  WHERE u.username = username_param
  LIMIT 1;
  
  -- Return user data
  -- referral_code is only returned if viewer is the owner
  RETURN QUERY
  SELECT 
    u.id AS user_id,
    u.username,
    u.name,
    u.avatar_url,
    u.bio,
    CASE 
      WHEN viewer_id = u.id THEN u.referral_code 
      ELSE NULL 
    END AS referral_code
  FROM users u
  WHERE u.username = username_param
  LIMIT 1;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_style_link_data TO anon, authenticated;

-- Create RPC to get aggregated style link stats for owner
CREATE OR REPLACE FUNCTION public.get_style_link_stats(owner_user_id_param UUID)
RETURNS TABLE (
  event_type TEXT,
  count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return stats if the caller is the owner
  IF auth.uid() != owner_user_id_param THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    sla.event_type,
    COUNT(*)::BIGINT as count
  FROM style_link_analytics sla
  WHERE sla.owner_user_id = owner_user_id_param
  GROUP BY sla.event_type;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_style_link_stats TO authenticated;