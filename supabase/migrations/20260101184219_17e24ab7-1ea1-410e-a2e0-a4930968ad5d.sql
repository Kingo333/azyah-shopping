-- ============================================================
-- TASK 3: Add source product linking fields to wardrobe_items
-- ============================================================
ALTER TABLE wardrobe_items 
ADD COLUMN IF NOT EXISTS source_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS source_vendor_name TEXT;

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_wardrobe_items_source_product ON wardrobe_items(source_product_id) WHERE source_product_id IS NOT NULL;

-- ============================================================
-- TASK 4: Referral System
-- ============================================================

-- Add referral_code to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Generate referral codes for existing users (8-char uppercase alphanumeric)
UPDATE users 
SET referral_code = UPPER(SUBSTRING(MD5(id::text || created_at::text) FROM 1 FOR 8))
WHERE referral_code IS NULL;

-- Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES users(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'qualified', 'rewarded', 'blocked')),
  qualified_at TIMESTAMPTZ,
  rewarded_at TIMESTAMPTZ,
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Prevent duplicate referrals for same referred user
  CONSTRAINT unique_referred_user UNIQUE (referred_id)
);

-- Indexes for referrals
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- Enable RLS on referrals
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referrals
CREATE POLICY "Users can view their referrals as referrer"
ON referrals FOR SELECT
USING (auth.uid() = referrer_id);

CREATE POLICY "Users can view referrals where they are referred"
ON referrals FOR SELECT
USING (auth.uid() = referred_id);

CREATE POLICY "Service role can manage referrals"
ON referrals FOR ALL
USING (auth.role() = 'service_role');

-- ============================================================
-- TASK 4: Check and reward referral function
-- ============================================================
CREATE OR REPLACE FUNCTION check_and_reward_referral(p_referred_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral RECORD;
  v_action_count INTEGER;
  v_monthly_referrals INTEGER;
  v_referral_points INTEGER := 15; -- Points per successful referral
BEGIN
  -- Find pending referral for this user
  SELECT * INTO v_referral 
  FROM referrals 
  WHERE referred_id = p_referred_id AND status = 'pending';
  
  IF NOT FOUND THEN 
    RETURN jsonb_build_object('status', 'no_pending');
  END IF;
  
  -- Block self-referral
  IF v_referral.referrer_id = p_referred_id THEN
    UPDATE referrals SET status = 'blocked' WHERE id = v_referral.id;
    RETURN jsonb_build_object('status', 'self_referral_blocked');
  END IF;
  
  -- Check if referred user completed a qualifying action
  SELECT COUNT(*) INTO v_action_count 
  FROM points_ledger 
  WHERE user_id = p_referred_id 
    AND action_type IN ('wardrobe_add', 'outfit_create', 'daily_checkin');
  
  IF v_action_count = 0 THEN 
    RETURN jsonb_build_object('status', 'not_qualified_yet');
  END IF;
  
  -- Mark as qualified
  UPDATE referrals 
  SET status = 'qualified', qualified_at = now() 
  WHERE id = v_referral.id AND status = 'pending';
  
  -- Check monthly cap (max 10 rewards/month for referrer)
  SELECT COUNT(*) INTO v_monthly_referrals 
  FROM referrals
  WHERE referrer_id = v_referral.referrer_id 
    AND status = 'rewarded'
    AND rewarded_at >= date_trunc('month', now());
  
  IF v_monthly_referrals >= 10 THEN 
    RETURN jsonb_build_object(
      'status', 'monthly_cap_reached',
      'message', 'Referrer has reached monthly cap'
    );
  END IF;
  
  -- Award points to referrer
  INSERT INTO points_ledger (user_id, type, action_type, amount, idempotency_key, metadata)
  VALUES (
    v_referral.referrer_id, 
    'earn', 
    'referral_reward', 
    v_referral_points, 
    'referral:' || v_referral.id,
    jsonb_build_object('referred_user_id', p_referred_id, 'referral_id', v_referral.id)
  )
  ON CONFLICT (idempotency_key) DO NOTHING;
  
  -- Mark referral as rewarded
  UPDATE referrals 
  SET status = 'rewarded', rewarded_at = now(), points_awarded = v_referral_points
  WHERE id = v_referral.id;
  
  RETURN jsonb_build_object(
    'status', 'rewarded',
    'points', v_referral_points,
    'referrer_id', v_referral.referrer_id
  );
END;
$$;

-- ============================================================
-- TASK 1: Complete user deletion function
-- ============================================================
CREATE OR REPLACE FUNCTION delete_user_completely(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_counts JSONB := '{}'::jsonb;
  v_count INTEGER;
BEGIN
  -- Delete from all user-referencing tables in correct order
  -- (most dependent first, then less dependent)
  
  -- Fit-related
  DELETE FROM fit_items WHERE wardrobe_item_id IN (SELECT id FROM wardrobe_items WHERE user_id = target_user_id);
  GET DIAGNOSTICS v_count = ROW_COUNT; deleted_counts := deleted_counts || jsonb_build_object('fit_items_from_wardrobe', v_count);
  
  DELETE FROM fit_items WHERE fit_id IN (SELECT id FROM fits WHERE user_id = target_user_id);
  GET DIAGNOSTICS v_count = ROW_COUNT; deleted_counts := deleted_counts || jsonb_build_object('fit_items_from_fits', v_count);
  
  DELETE FROM fit_comments WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; deleted_counts := deleted_counts || jsonb_build_object('fit_comments', v_count);
  
  DELETE FROM fits WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; deleted_counts := deleted_counts || jsonb_build_object('fits', v_count);
  
  -- Wardrobe
  DELETE FROM wardrobe_items WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; deleted_counts := deleted_counts || jsonb_build_object('wardrobe_items', v_count);
  
  -- Points and rewards
  DELETE FROM points_ledger WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; deleted_counts := deleted_counts || jsonb_build_object('points_ledger', v_count);
  
  -- Referrals (both as referrer and referred)
  DELETE FROM referrals WHERE referrer_id = target_user_id OR referred_id = target_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; deleted_counts := deleted_counts || jsonb_build_object('referrals', v_count);
  
  -- Likes and swipes
  DELETE FROM likes WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; deleted_counts := deleted_counts || jsonb_build_object('likes', v_count);
  
  DELETE FROM swipes WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; deleted_counts := deleted_counts || jsonb_build_object('swipes', v_count);
  
  -- Wishlists and cart
  DELETE FROM wishlist_items WHERE wishlist_id IN (SELECT id FROM wishlists WHERE user_id = target_user_id);
  GET DIAGNOSTICS v_count = ROW_COUNT; deleted_counts := deleted_counts || jsonb_build_object('wishlist_items', v_count);
  
  DELETE FROM wishlists WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; deleted_counts := deleted_counts || jsonb_build_object('wishlists', v_count);
  
  DELETE FROM cart_items WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; deleted_counts := deleted_counts || jsonb_build_object('cart_items', v_count);
  
  -- Social
  DELETE FROM follows WHERE follower_id = target_user_id OR following_id = target_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; deleted_counts := deleted_counts || jsonb_build_object('follows', v_count);
  
  DELETE FROM friendships WHERE user_id = target_user_id OR friend_id = target_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; deleted_counts := deleted_counts || jsonb_build_object('friendships', v_count);
  
  -- Events and analytics
  DELETE FROM events WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; deleted_counts := deleted_counts || jsonb_build_object('events', v_count);
  
  DELETE FROM beauty_consult_events WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; deleted_counts := deleted_counts || jsonb_build_object('beauty_consult_events', v_count);
  
  DELETE FROM beauty_consults WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; deleted_counts := deleted_counts || jsonb_build_object('beauty_consults', v_count);
  
  DELETE FROM beauty_profiles WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; deleted_counts := deleted_counts || jsonb_build_object('beauty_profiles', v_count);
  
  -- AI features
  DELETE FROM ai_assets WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; deleted_counts := deleted_counts || jsonb_build_object('ai_assets', v_count);
  
  DELETE FROM ai_tryon_jobs WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; deleted_counts := deleted_counts || jsonb_build_object('ai_tryon_jobs', v_count);
  
  -- Event try-on
  DELETE FROM event_tryon_jobs WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; deleted_counts := deleted_counts || jsonb_build_object('event_tryon_jobs', v_count);
  
  DELETE FROM event_user_photos WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; deleted_counts := deleted_counts || jsonb_build_object('event_user_photos', v_count);
  
  DELETE FROM event_participants WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; deleted_counts := deleted_counts || jsonb_build_object('event_participants', v_count);
  
  -- Affiliate
  DELETE FROM affiliate_links WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; deleted_counts := deleted_counts || jsonb_build_object('affiliate_links', v_count);
  
  -- UGC / Brand reviews
  DELETE FROM brand_answers WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; deleted_counts := deleted_counts || jsonb_build_object('brand_answers', v_count);
  
  DELETE FROM brand_questions WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; deleted_counts := deleted_counts || jsonb_build_object('brand_questions', v_count);
  
  DELETE FROM brand_reviews WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; deleted_counts := deleted_counts || jsonb_build_object('brand_reviews', v_count);
  
  DELETE FROM brand_scam_reports WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; deleted_counts := deleted_counts || jsonb_build_object('brand_scam_reports', v_count);
  
  -- Collaborations
  DELETE FROM collab_applications WHERE shopper_id = target_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; deleted_counts := deleted_counts || jsonb_build_object('collab_applications', v_count);
  
  DELETE FROM collab_status_history WHERE changed_by = target_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; deleted_counts := deleted_counts || jsonb_build_object('collab_status_history', v_count);
  
  DELETE FROM collaborations WHERE created_by = target_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; deleted_counts := deleted_counts || jsonb_build_object('collaborations', v_count);
  
  -- Import sources
  DELETE FROM import_sources WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; deleted_counts := deleted_counts || jsonb_build_object('import_sources', v_count);
  
  DELETE FROM import_job_status WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; deleted_counts := deleted_counts || jsonb_build_object('import_job_status', v_count);
  
  -- Brands owned by user (set owner to null instead of deleting)
  UPDATE brands SET owner_user_id = NULL WHERE owner_user_id = target_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; deleted_counts := deleted_counts || jsonb_build_object('brands_orphaned', v_count);
  
  -- Retailers owned by user (set owner to null instead of deleting)
  UPDATE retailers SET owner_user_id = NULL WHERE owner_user_id = target_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; deleted_counts := deleted_counts || jsonb_build_object('retailers_orphaned', v_count);
  
  -- Finally delete from users table
  DELETE FROM users WHERE id = target_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; deleted_counts := deleted_counts || jsonb_build_object('users', v_count);
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'deleted_counts', deleted_counts
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'user_id', target_user_id,
      'error', SQLERRM,
      'deleted_counts', deleted_counts
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION delete_user_completely(UUID) TO service_role;