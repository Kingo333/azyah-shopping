-- ============================================================
-- PERFORMANCE CLIPPING PHASE 1 - MIGRATION PART 1
-- Schema changes (enum value added but not used yet)
-- ============================================================

-- 1) Extend collaborations table with campaign fields
ALTER TABLE collaborations
ADD COLUMN IF NOT EXISTS total_budget NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS slots_total INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS posts_per_creator INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS acceptance_mode TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS payout_hold_days INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS bonus_pool NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS application_strategy TEXT DEFAULT 'waitlist_when_full';

COMMENT ON COLUMN collaborations.total_budget IS 'Total campaign budget in specified currency';
COMMENT ON COLUMN collaborations.slots_total IS 'Maximum accepted creators (slots)';
COMMENT ON COLUMN collaborations.posts_per_creator IS 'Max deliverables per creator (MVP: 1)';
COMMENT ON COLUMN collaborations.acceptance_mode IS 'manual or auto_first_n';
COMMENT ON COLUMN collaborations.payout_hold_days IS 'Days before payout confirmed';
COMMENT ON COLUMN collaborations.bonus_pool IS 'Separate budget for viral bonuses (Phase 2)';

-- 2) Add WAITLISTED to application_status enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'WAITLISTED' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'application_status')
  ) THEN
    ALTER TYPE application_status ADD VALUE 'WAITLISTED';
  END IF;
END$$;

-- 3) Create deliverable_status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'deliverable_status') THEN
    CREATE TYPE deliverable_status AS ENUM (
      'submitted', 
      'under_review', 
      'approved', 
      'revision_requested', 
      'rejected'
    );
  END IF;
END$$;

-- 4) Create payout_status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payout_status') THEN
    CREATE TYPE payout_status AS ENUM (
      'pending_approval', 
      'owed', 
      'hold', 
      'confirmed', 
      'paid', 
      'unpaid_issue'
    );
  END IF;
END$$;

-- 5) Create creator_deliverables table
CREATE TABLE IF NOT EXISTS creator_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collab_id UUID NOT NULL REFERENCES collaborations(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES collab_applications(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL,
  platform TEXT NOT NULL,
  post_url TEXT NOT NULL,
  screenshot_path TEXT NOT NULL,
  status deliverable_status DEFAULT 'submitted',
  review_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_post_url_per_collab UNIQUE (collab_id, post_url)
);

CREATE INDEX IF NOT EXISTS idx_deliverables_collab ON creator_deliverables(collab_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_creator ON creator_deliverables(creator_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_status ON creator_deliverables(status);

-- 6) Create creator_payouts table with duplicate prevention
CREATE TABLE IF NOT EXISTS creator_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collab_id UUID NOT NULL REFERENCES collaborations(id),
  deliverable_id UUID NOT NULL REFERENCES creator_deliverables(id),
  creator_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'AED',
  payout_type TEXT NOT NULL DEFAULT 'base',
  status payout_status DEFAULT 'pending_approval',
  marked_unpaid_reason TEXT,
  approved_at TIMESTAMPTZ,
  hold_until TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  marked_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_payout_per_deliverable UNIQUE (deliverable_id, payout_type)
);

CREATE INDEX IF NOT EXISTS idx_payouts_creator ON creator_payouts(creator_id);
CREATE INDEX IF NOT EXISTS idx_payouts_collab ON creator_payouts(collab_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON creator_payouts(status);

-- 7) Create PRIVATE storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('deliverable-screenshots', 'deliverable-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- 8) Storage policy: ONLY creators can upload to their own folder
CREATE POLICY "Creators upload own screenshots"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'deliverable-screenshots' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 9) Helper function: Check if user owns the org that owns a collab
CREATE OR REPLACE FUNCTION is_collab_owner(p_collab_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM collaborations c
    WHERE c.id = p_collab_id
    AND c.owner_org_id IN (
      SELECT id FROM brands WHERE owner_user_id = auth.uid()
      UNION
      SELECT id FROM retailers WHERE owner_user_id = auth.uid()
    )
  )
$$;

-- 10) Enable RLS on new tables
ALTER TABLE creator_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_payouts ENABLE ROW LEVEL SECURITY;

-- 11) RLS policies for deliverables
CREATE POLICY "Creators see own deliverables"
ON creator_deliverables FOR SELECT TO authenticated
USING (creator_id = auth.uid());

CREATE POLICY "Creators insert own deliverables"
ON creator_deliverables FOR INSERT TO authenticated
WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Org owners see campaign deliverables"
ON creator_deliverables FOR SELECT TO authenticated
USING (is_collab_owner(collab_id));

CREATE POLICY "Org owners update deliverables"
ON creator_deliverables FOR UPDATE TO authenticated
USING (is_collab_owner(collab_id));

-- 12) RLS policies for payouts
CREATE POLICY "Creators see own payouts"
ON creator_payouts FOR SELECT TO authenticated
USING (creator_id = auth.uid());

CREATE POLICY "Org owners see campaign payouts"
ON creator_payouts FOR SELECT TO authenticated
USING (is_collab_owner(collab_id));

CREATE POLICY "Org owners update payouts"
ON creator_payouts FOR UPDATE TO authenticated
USING (is_collab_owner(collab_id));