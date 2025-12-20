-- ========================================================
-- POINTS + SALON REWARDS SYSTEM
-- Schema with idempotency, anti-abuse, and profit protection
-- ========================================================

-- ======================
-- 1. POINTS LEDGER TABLE (append-only, idempotent)
-- ======================
CREATE TABLE public.points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('earn', 'spend')),
  action_type TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  source_id UUID,
  idempotency_key TEXT UNIQUE NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_points_ledger_user_date ON points_ledger(user_id, created_at DESC);
CREATE INDEX idx_points_ledger_user_action_date ON points_ledger(user_id, action_type, created_at);
CREATE INDEX idx_points_ledger_idempotency ON points_ledger(idempotency_key);

-- RLS: Users can only read their own points
ALTER TABLE points_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own points ledger"
  ON points_ledger FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies - only via RPC

-- ======================
-- 2. SALONS TABLE
-- ======================
CREATE TABLE public.salons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  cover_image_url TEXT,
  description TEXT,
  address TEXT,
  city TEXT NOT NULL CHECK (city IN ('dubai', 'abudhabi', 'sharjah')),
  phone TEXT,
  instagram TEXT,
  website TEXT,
  rating NUMERIC(2,1) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  review_count INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  owner_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_salons_city ON salons(city) WHERE is_active = true;
CREATE INDEX idx_salons_slug ON salons(slug);

-- RLS for salons
ALTER TABLE salons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active salons"
  ON salons FOR SELECT
  USING (is_active = true);

CREATE POLICY "Salon owners manage their salon"
  ON salons FOR ALL
  USING (auth.uid() = owner_user_id);

-- ======================
-- 3. SALON SERVICES TABLE
-- ======================
CREATE TABLE public.salon_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('nails', 'hair', 'facial', 'massage', 'makeup', 'other')),
  description TEXT,
  price_aed NUMERIC(10,2) NOT NULL CHECK (price_aed >= 0),
  duration_minutes INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_salon_services_salon ON salon_services(salon_id) WHERE is_active = true;

-- RLS for services
ALTER TABLE salon_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active services"
  ON salon_services FOR SELECT
  USING (is_active = true AND EXISTS (
    SELECT 1 FROM salons WHERE id = salon_id AND is_active = true
  ));

CREATE POLICY "Salon owners manage their services"
  ON salon_services FOR ALL
  USING (EXISTS (
    SELECT 1 FROM salons WHERE id = salon_id AND owner_user_id = auth.uid()
  ));

-- ======================
-- 4. SALON REWARD OFFERS TABLE (discount-first, profit-protected)
-- ======================
CREATE TABLE public.salon_reward_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  service_category TEXT, -- null = all services
  discount_type TEXT NOT NULL CHECK (discount_type IN ('PERCENT', 'FREE')),
  discount_value INTEGER NOT NULL CHECK (discount_value IN (25, 50, 60, 100)),
  points_cost INTEGER NOT NULL CHECK (points_cost > 0),
  min_spend_aed NUMERIC(10,2) NOT NULL DEFAULT 0,
  requires_approval BOOLEAN DEFAULT true,
  cooldown_days INTEGER NOT NULL DEFAULT 7, -- per-user cooldown
  monthly_cap INTEGER NOT NULL DEFAULT 2, -- per-user per-offer monthly limit
  total_redemptions_limit INTEGER, -- global budget limit (null = unlimited)
  total_redemptions_count INTEGER DEFAULT 0,
  funding_source TEXT DEFAULT 'salon' CHECK (funding_source IN ('salon', 'azyah', 'shared')),
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMPTZ DEFAULT now(),
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_offers_salon ON salon_reward_offers(salon_id) WHERE is_active = true;
CREATE INDEX idx_offers_active ON salon_reward_offers(is_active, start_date, end_date);

-- RLS for offers
ALTER TABLE salon_reward_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active offers"
  ON salon_reward_offers FOR SELECT
  USING (
    is_active = true 
    AND start_date <= now() 
    AND (end_date IS NULL OR end_date > now())
    AND (total_redemptions_limit IS NULL OR total_redemptions_count < total_redemptions_limit)
  );

CREATE POLICY "Salon owners manage their offers"
  ON salon_reward_offers FOR ALL
  USING (EXISTS (
    SELECT 1 FROM salons WHERE id = salon_id AND owner_user_id = auth.uid()
  ));

-- ======================
-- 5. REDEMPTIONS TABLE
-- ======================
CREATE TABLE public.redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  salon_id UUID NOT NULL REFERENCES salons(id),
  offer_id UUID NOT NULL REFERENCES salon_reward_offers(id),
  points_spent INTEGER NOT NULL CHECK (points_spent > 0),
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'redeemed', 'expired', 'cancelled')),
  redemption_code TEXT UNIQUE,
  code_expires_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  redeemed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  salon_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_redemptions_user ON redemptions(user_id, created_at DESC);
CREATE INDEX idx_redemptions_salon ON redemptions(salon_id, status);
CREATE INDEX idx_redemptions_code ON redemptions(redemption_code) WHERE redemption_code IS NOT NULL;

-- RLS for redemptions
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own redemptions"
  ON redemptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own redemptions"
  ON redemptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Salon owners manage their redemptions"
  ON redemptions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM salons WHERE id = salon_id AND owner_user_id = auth.uid()
  ));

-- ======================
-- 6. TRIGGERS for updated_at
-- ======================
CREATE TRIGGER set_salons_updated_at
  BEFORE UPDATE ON salons
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_salon_reward_offers_updated_at
  BEFORE UPDATE ON salon_reward_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ======================
-- 7. RPC: award_points (idempotent, rate-limited)
-- ======================
CREATE OR REPLACE FUNCTION public.award_points(
  p_action_type TEXT,
  p_source_id UUID DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_points INTEGER;
  v_daily_cap INTEGER;
  v_today_count INTEGER;
  v_hard_cap INTEGER := 80;
  v_today_total INTEGER;
  v_final_key TEXT;
BEGIN
  -- Must be authenticated
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  -- ONLY these 3 action types allowed - no exceptions
  IF p_action_type NOT IN ('daily_checkin', 'wardrobe_add', 'outfit_create') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action type: ' || p_action_type);
  END IF;

  -- Define points and per-action daily caps
  CASE p_action_type
    WHEN 'daily_checkin' THEN v_points := 10; v_daily_cap := 1;
    WHEN 'wardrobe_add' THEN v_points := 2; v_daily_cap := 10;
    WHEN 'outfit_create' THEN v_points := 12; v_daily_cap := 3;
  END CASE;

  -- Build idempotency key if not provided
  v_final_key := COALESCE(
    p_idempotency_key, 
    p_action_type || ':' || COALESCE(p_source_id::text, v_user_id::text) || ':' || CURRENT_DATE::text
  );

  -- Check idempotency - same action cannot award twice
  IF EXISTS (SELECT 1 FROM points_ledger WHERE idempotency_key = v_final_key) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already awarded', 'duplicate', true);
  END IF;

  -- Check per-action daily cap
  SELECT COUNT(*) INTO v_today_count 
  FROM points_ledger 
  WHERE user_id = v_user_id 
    AND action_type = p_action_type 
    AND type = 'earn'
    AND created_at::date = CURRENT_DATE;
  
  IF v_today_count >= v_daily_cap THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Daily limit reached for ' || p_action_type, 
      'limit', v_daily_cap,
      'current_count', v_today_count
    );
  END IF;

  -- Check hard daily cap (80 points max per day)
  SELECT COALESCE(SUM(amount), 0) INTO v_today_total 
  FROM points_ledger 
  WHERE user_id = v_user_id 
    AND type = 'earn' 
    AND created_at::date = CURRENT_DATE;
  
  IF v_today_total + v_points > v_hard_cap THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Daily points cap reached', 
      'limit', v_hard_cap,
      'current_total', v_today_total
    );
  END IF;

  -- All checks passed - award points
  INSERT INTO points_ledger (user_id, type, action_type, amount, source_id, idempotency_key, metadata)
  VALUES (v_user_id, 'earn', p_action_type, v_points, p_source_id, v_final_key, p_metadata);

  RETURN jsonb_build_object(
    'success', true, 
    'points_awarded', v_points, 
    'action_type', p_action_type,
    'new_daily_total', v_today_total + v_points
  );
END;
$$;

-- ======================
-- 8. RPC: get_user_points_balance
-- ======================
CREATE OR REPLACE FUNCTION public.get_user_points_balance()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_balance INTEGER;
  v_earned_total INTEGER;
  v_spent_total INTEGER;
  v_today_earned INTEGER;
  v_recent JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  -- Calculate totals
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'earn' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'spend' THEN amount ELSE 0 END), 0)
  INTO v_earned_total, v_spent_total
  FROM points_ledger WHERE user_id = v_user_id;

  v_balance := v_earned_total - v_spent_total;

  -- Today's earnings
  SELECT COALESCE(SUM(amount), 0) INTO v_today_earned
  FROM points_ledger 
  WHERE user_id = v_user_id AND type = 'earn' AND created_at::date = CURRENT_DATE;

  -- Recent activity (last 30 days, limit 50)
  SELECT COALESCE(jsonb_agg(activity ORDER BY created_at DESC), '[]'::jsonb)
  INTO v_recent
  FROM (
    SELECT 
      action_type, 
      amount, 
      type, 
      created_at,
      metadata
    FROM points_ledger 
    WHERE user_id = v_user_id AND created_at > now() - interval '30 days'
    ORDER BY created_at DESC 
    LIMIT 50
  ) activity;

  RETURN jsonb_build_object(
    'success', true,
    'balance', v_balance,
    'earned_total', v_earned_total,
    'spent_total', v_spent_total,
    'today_earned', v_today_earned,
    'today_cap', 80,
    'recent_activity', v_recent
  );
END;
$$;

-- ======================
-- 9. RPC: redeem_offer (Premium-only, with all protections)
-- ======================
CREATE OR REPLACE FUNCTION public.redeem_offer(p_offer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_premium BOOLEAN;
  v_premium_expires_at TIMESTAMPTZ;
  v_balance INTEGER;
  v_offer RECORD;
  v_last_redemption TIMESTAMPTZ;
  v_monthly_count INTEGER;
  v_redemption_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  -- Check premium status from profiles table (source of truth)
  SELECT is_premium, premium_expires_at INTO v_is_premium, v_premium_expires_at
  FROM profiles 
  WHERE id = v_user_id;
  
  -- Validate premium: must be premium AND not expired
  IF NOT COALESCE(v_is_premium, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Premium membership required', 'upgrade_required', true);
  END IF;
  
  IF v_premium_expires_at IS NOT NULL AND v_premium_expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Premium membership expired', 'upgrade_required', true);
  END IF;

  -- Get offer details with all constraints
  SELECT * INTO v_offer 
  FROM salon_reward_offers 
  WHERE id = p_offer_id 
    AND is_active = true 
    AND start_date <= now()
    AND (end_date IS NULL OR end_date > now())
    AND (total_redemptions_limit IS NULL OR total_redemptions_count < total_redemptions_limit);
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Offer not available or expired');
  END IF;

  -- Calculate user's current balance
  SELECT COALESCE(SUM(CASE WHEN type = 'earn' THEN amount ELSE -amount END), 0) 
  INTO v_balance 
  FROM points_ledger WHERE user_id = v_user_id;

  IF v_balance < v_offer.points_cost THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Insufficient points', 
      'balance', v_balance, 
      'required', v_offer.points_cost
    );
  END IF;

  -- Check cooldown (per-user per-salon)
  SELECT MAX(created_at) INTO v_last_redemption 
  FROM redemptions 
  WHERE user_id = v_user_id 
    AND salon_id = v_offer.salon_id 
    AND status NOT IN ('cancelled', 'expired');

  IF v_last_redemption IS NOT NULL 
     AND v_last_redemption > now() - (v_offer.cooldown_days || ' days')::interval THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Cooldown period active', 
      'next_eligible', v_last_redemption + (v_offer.cooldown_days || ' days')::interval
    );
  END IF;

  -- Check monthly cap per user per offer
  SELECT COUNT(*) INTO v_monthly_count 
  FROM redemptions 
  WHERE user_id = v_user_id 
    AND offer_id = p_offer_id 
    AND created_at > date_trunc('month', now()) 
    AND status NOT IN ('cancelled', 'expired');

  IF v_monthly_count >= v_offer.monthly_cap THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Monthly limit reached for this offer', 
      'limit', v_offer.monthly_cap,
      'used', v_monthly_count
    );
  END IF;

  -- All checks passed - create redemption atomically
  v_redemption_id := gen_random_uuid();

  -- Deduct points
  INSERT INTO points_ledger (user_id, type, action_type, amount, source_id, idempotency_key, metadata)
  VALUES (
    v_user_id, 
    'spend', 
    'redemption', 
    v_offer.points_cost, 
    v_redemption_id, 
    'redemption:' || v_redemption_id,
    jsonb_build_object('offer_id', p_offer_id, 'salon_id', v_offer.salon_id, 'discount_value', v_offer.discount_value)
  );

  -- Create redemption record
  INSERT INTO redemptions (id, user_id, salon_id, offer_id, points_spent, status)
  VALUES (v_redemption_id, v_user_id, v_offer.salon_id, p_offer_id, v_offer.points_cost, 'requested');

  -- Increment offer redemption count
  UPDATE salon_reward_offers 
  SET total_redemptions_count = COALESCE(total_redemptions_count, 0) + 1
  WHERE id = p_offer_id;

  RETURN jsonb_build_object(
    'success', true, 
    'redemption_id', v_redemption_id, 
    'status', 'requested', 
    'requires_approval', v_offer.requires_approval,
    'discount_value', v_offer.discount_value,
    'min_spend_aed', v_offer.min_spend_aed
  );
END;
$$;

-- ======================
-- 10. RPC: approve_redemption (salon-side)
-- ======================
CREATE OR REPLACE FUNCTION public.approve_redemption(p_redemption_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_redemption RECORD;
  v_code TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  -- Get redemption and verify salon ownership
  SELECT r.*, s.owner_user_id 
  INTO v_redemption
  FROM redemptions r
  JOIN salons s ON s.id = r.salon_id
  WHERE r.id = p_redemption_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Redemption not found');
  END IF;

  IF v_redemption.owner_user_id != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF v_redemption.status != 'requested' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Redemption is not in requested status');
  END IF;

  -- Generate 6-char alphanumeric code
  v_code := upper(substring(md5(random()::text) from 1 for 6));

  -- Update redemption with code and expiry (30 minutes)
  UPDATE redemptions 
  SET 
    status = 'approved',
    redemption_code = v_code,
    code_expires_at = now() + interval '30 minutes',
    approved_at = now()
  WHERE id = p_redemption_id;

  RETURN jsonb_build_object(
    'success', true,
    'redemption_code', v_code,
    'expires_at', now() + interval '30 minutes'
  );
END;
$$;

-- ======================
-- 11. RPC: mark_redeemed (finalize redemption)
-- ======================
CREATE OR REPLACE FUNCTION public.mark_redeemed(p_redemption_id UUID, p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_redemption RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  -- Get redemption and verify salon ownership
  SELECT r.*, s.owner_user_id 
  INTO v_redemption
  FROM redemptions r
  JOIN salons s ON s.id = r.salon_id
  WHERE r.id = p_redemption_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Redemption not found');
  END IF;

  IF v_redemption.owner_user_id != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF v_redemption.status != 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Redemption is not approved');
  END IF;

  IF v_redemption.redemption_code != upper(p_code) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid code');
  END IF;

  IF v_redemption.code_expires_at < now() THEN
    UPDATE redemptions SET status = 'expired' WHERE id = p_redemption_id;
    RETURN jsonb_build_object('success', false, 'error', 'Code expired');
  END IF;

  -- Mark as redeemed
  UPDATE redemptions 
  SET status = 'redeemed', redeemed_at = now()
  WHERE id = p_redemption_id;

  RETURN jsonb_build_object('success', true, 'status', 'redeemed');
END;
$$;

-- ======================
-- 12. RPC: check_daily_checkin_status
-- ======================
CREATE OR REPLACE FUNCTION public.check_daily_checkin_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_checked_in_today BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM points_ledger 
    WHERE user_id = v_user_id 
      AND action_type = 'daily_checkin' 
      AND created_at::date = CURRENT_DATE
  ) INTO v_checked_in_today;

  RETURN jsonb_build_object(
    'success', true,
    'checked_in_today', v_checked_in_today
  );
END;
$$;

-- ======================
-- 13. SEED DATA: Sample salons and offers
-- ======================
INSERT INTO salons (name, slug, city, description, rating, is_active) VALUES
  ('Glamour Nails Dubai', 'glamour-nails-dubai', 'dubai', 'Premium nail salon in Dubai Mall', 4.8, true),
  ('Beauty Oasis', 'beauty-oasis', 'dubai', 'Full-service spa and beauty center', 4.5, true),
  ('Lux Hair Studio', 'lux-hair-studio', 'abudhabi', 'Expert hair styling and treatments', 4.7, true),
  ('Serenity Spa', 'serenity-spa', 'abudhabi', 'Relaxation and wellness destination', 4.9, true),
  ('Nail Art Studio', 'nail-art-studio', 'sharjah', 'Creative nail designs and care', 4.3, true);

-- Insert sample offers with profit-protecting defaults
INSERT INTO salon_reward_offers (salon_id, title, description, discount_type, discount_value, points_cost, min_spend_aed, requires_approval, cooldown_days, monthly_cap, funding_source)
SELECT 
  id, 
  '25% Off Any Service', 
  'Get 25% off your next visit', 
  'PERCENT', 
  25, 
  450, 
  150, 
  false, 
  7, 
  2,
  'salon'
FROM salons WHERE slug = 'glamour-nails-dubai';

INSERT INTO salon_reward_offers (salon_id, title, description, discount_type, discount_value, points_cost, min_spend_aed, requires_approval, cooldown_days, monthly_cap, funding_source)
SELECT 
  id, 
  '50% Off Premium Package', 
  'Half price on our premium spa packages', 
  'PERCENT', 
  50, 
  1800, 
  250, 
  true, 
  14, 
  1,
  'salon'
FROM salons WHERE slug = 'beauty-oasis';

INSERT INTO salon_reward_offers (salon_id, title, description, discount_type, discount_value, points_cost, min_spend_aed, requires_approval, cooldown_days, monthly_cap, funding_source)
SELECT 
  id, 
  '60% Off First Visit', 
  'Exclusive discount for Azyah members', 
  'PERCENT', 
  60, 
  2700, 
  350, 
  true, 
  30, 
  1,
  'shared'
FROM salons WHERE slug = 'lux-hair-studio';