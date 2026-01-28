-- ============================================================
-- PERFORMANCE CLIPPING PHASE 1 - MIGRATION PART 2
-- Views and RPCs that use WAITLISTED enum value
-- ============================================================

-- 1) Create collab_capacity view (computed slots)
CREATE OR REPLACE VIEW collab_capacity AS
SELECT 
  c.id as collab_id,
  c.slots_total,
  COUNT(ca.id) FILTER (WHERE ca.status = 'ACCEPTED') as slots_filled,
  COALESCE(c.slots_total, 0) - COALESCE(COUNT(ca.id) FILTER (WHERE ca.status = 'ACCEPTED'), 0) as slots_remaining,
  COUNT(ca.id) FILTER (WHERE ca.status = 'WAITLISTED') as waitlist_count,
  CASE 
    WHEN c.slots_total IS NOT NULL AND c.total_budget IS NOT NULL AND c.slots_total > 0
    THEN c.total_budget / c.slots_total
    ELSE NULL
  END as base_payout_per_slot
FROM collaborations c
LEFT JOIN collab_applications ca ON c.id = ca.collab_id
GROUP BY c.id, c.slots_total, c.total_budget;

-- 2) RPC: Apply to collab (uses auth.uid() as creator)
CREATE OR REPLACE FUNCTION apply_to_collab(
  p_collab_id UUID,
  p_social_links JSONB,
  p_note TEXT DEFAULT NULL
)
RETURNS TABLE(application_id UUID, status TEXT, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_id UUID := auth.uid();
  v_slots_total INTEGER;
  v_slots_filled INTEGER;
  v_acceptance_mode TEXT;
  v_collab_status TEXT;
  v_new_status application_status;
  v_app_id UUID;
BEGIN
  IF v_creator_id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, 'error'::TEXT, 'Not authenticated'::TEXT;
    RETURN;
  END IF;

  SELECT c.slots_total, c.acceptance_mode, c.status::TEXT,
         COALESCE((SELECT COUNT(*) FROM collab_applications WHERE collab_id = p_collab_id AND status = 'ACCEPTED'), 0)
  INTO v_slots_total, v_acceptance_mode, v_collab_status, v_slots_filled
  FROM collaborations c
  WHERE c.id = p_collab_id;

  IF v_collab_status IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, 'error'::TEXT, 'Collaboration not found'::TEXT;
    RETURN;
  END IF;

  IF v_collab_status != 'ACTIVE' THEN
    RETURN QUERY SELECT NULL::UUID, 'error'::TEXT, 'Collaboration is not accepting applications'::TEXT;
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM collab_applications WHERE collab_id = p_collab_id AND shopper_id = v_creator_id) THEN
    RETURN QUERY SELECT NULL::UUID, 'error'::TEXT, 'Already applied to this collaboration'::TEXT;
    RETURN;
  END IF;

  IF v_slots_total IS NULL OR v_slots_filled < v_slots_total THEN
    IF v_acceptance_mode = 'auto_first_n' THEN
      v_new_status := 'ACCEPTED';
    ELSE
      v_new_status := 'PENDING';
    END IF;
  ELSE
    v_new_status := 'WAITLISTED';
  END IF;

  INSERT INTO collab_applications (collab_id, shopper_id, social_links, note, status)
  VALUES (p_collab_id, v_creator_id, p_social_links, p_note, v_new_status)
  RETURNING id INTO v_app_id;

  RETURN QUERY SELECT v_app_id, v_new_status::TEXT, 
    CASE 
      WHEN v_new_status = 'WAITLISTED' THEN 'Campaign is full. You have been added to the waitlist.'
      WHEN v_new_status = 'ACCEPTED' THEN 'You have been automatically accepted!'
      ELSE 'Application submitted successfully.'
    END;
END;
$$;

-- 3) RPC: Accept applicant (MUST be org owner)
CREATE OR REPLACE FUNCTION accept_applicant(p_application_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_collab_id UUID;
  v_slots_total INTEGER;
  v_slots_filled INTEGER;
BEGIN
  SELECT ca.collab_id INTO v_collab_id
  FROM collab_applications ca
  WHERE ca.id = p_application_id;

  IF v_collab_id IS NULL THEN
    RETURN QUERY SELECT false, 'Application not found';
    RETURN;
  END IF;

  IF NOT is_collab_owner(v_collab_id) THEN
    RETURN QUERY SELECT false, 'Not authorized to manage this collaboration';
    RETURN;
  END IF;

  SELECT c.slots_total, COALESCE(
    (SELECT COUNT(*) FROM collab_applications WHERE collab_id = v_collab_id AND status = 'ACCEPTED'), 0
  )
  INTO v_slots_total, v_slots_filled
  FROM collaborations c
  WHERE c.id = v_collab_id;

  IF v_slots_total IS NOT NULL AND v_slots_filled >= v_slots_total THEN
    UPDATE collab_applications 
    SET status = 'WAITLISTED', reviewed_by = auth.uid(), reviewed_at = NOW()
    WHERE id = p_application_id;
    RETURN QUERY SELECT false, 'No slots available. Applicant moved to waitlist.';
    RETURN;
  END IF;

  UPDATE collab_applications 
  SET status = 'ACCEPTED', reviewed_by = auth.uid(), reviewed_at = NOW()
  WHERE id = p_application_id;

  RETURN QUERY SELECT true, 'Applicant accepted successfully.';
END;
$$;

-- 4) RPC: Submit deliverable (full validation)
CREATE OR REPLACE FUNCTION submit_deliverable(
  p_application_id UUID,
  p_collab_id UUID,
  p_platform TEXT,
  p_post_url TEXT,
  p_screenshot_path TEXT
)
RETURNS TABLE(deliverable_id UUID, success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_id UUID := auth.uid();
  v_app_status application_status;
  v_app_collab_id UUID;
  v_posts_per_creator INTEGER;
  v_current_count INTEGER;
  v_platforms TEXT[];
  v_collab_status TEXT;
  v_del_id UUID;
  v_url_lower TEXT;
BEGIN
  IF v_creator_id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, false, 'Not authenticated';
    RETURN;
  END IF;

  SELECT status, collab_id INTO v_app_status, v_app_collab_id
  FROM collab_applications
  WHERE id = p_application_id AND shopper_id = v_creator_id;

  IF v_app_status IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, false, 'Application not found or not yours';
    RETURN;
  END IF;

  IF v_app_collab_id != p_collab_id THEN
    RETURN QUERY SELECT NULL::UUID, false, 'Application does not belong to this collaboration';
    RETURN;
  END IF;

  IF v_app_status != 'ACCEPTED' THEN
    RETURN QUERY SELECT NULL::UUID, false, 'You must be accepted to submit deliverables';
    RETURN;
  END IF;

  SELECT posts_per_creator, platforms, status::TEXT
  INTO v_posts_per_creator, v_platforms, v_collab_status
  FROM collaborations WHERE id = p_collab_id;

  IF v_collab_status NOT IN ('ACTIVE', 'PAUSED') THEN
    RETURN QUERY SELECT NULL::UUID, false, 'Collaboration is no longer active';
    RETURN;
  END IF;

  IF NOT (p_platform = ANY(v_platforms)) THEN
    RETURN QUERY SELECT NULL::UUID, false, 'Platform not allowed for this campaign';
    RETURN;
  END IF;

  -- SERVER-SIDE URL VALIDATION
  v_url_lower := lower(p_post_url);
  IF p_platform = 'tiktok' AND v_url_lower NOT LIKE '%tiktok.com%' THEN
    RETURN QUERY SELECT NULL::UUID, false, 'Invalid TikTok URL';
    RETURN;
  END IF;
  IF p_platform = 'instagram' AND v_url_lower NOT LIKE '%instagram.com%' AND v_url_lower NOT LIKE '%instagr.am%' THEN
    RETURN QUERY SELECT NULL::UUID, false, 'Invalid Instagram URL';
    RETURN;
  END IF;
  IF p_platform = 'snapchat' AND v_url_lower NOT LIKE '%snapchat.com%' THEN
    RETURN QUERY SELECT NULL::UUID, false, 'Invalid Snapchat URL';
    RETURN;
  END IF;
  IF p_platform = 'youtube' AND v_url_lower NOT LIKE '%youtube.com%' AND v_url_lower NOT LIKE '%youtu.be%' THEN
    RETURN QUERY SELECT NULL::UUID, false, 'Invalid YouTube URL';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_current_count
  FROM creator_deliverables
  WHERE collab_id = p_collab_id AND creator_id = v_creator_id;

  IF v_current_count >= COALESCE(v_posts_per_creator, 1) THEN
    RETURN QUERY SELECT NULL::UUID, false, 'Maximum submissions reached for this campaign';
    RETURN;
  END IF;

  BEGIN
    INSERT INTO creator_deliverables (
      collab_id, application_id, creator_id, platform, post_url, screenshot_path
    )
    VALUES (p_collab_id, p_application_id, v_creator_id, p_platform, p_post_url, p_screenshot_path)
    RETURNING id INTO v_del_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN QUERY SELECT NULL::UUID, false, 'This URL has already been submitted';
    RETURN;
  END;

  RETURN QUERY SELECT v_del_id, true, 'Deliverable submitted successfully';
END;
$$;

-- 5) RPC: Review deliverable (prevents duplicate payouts)
CREATE OR REPLACE FUNCTION review_deliverable(
  p_deliverable_id UUID,
  p_action TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_collab_id UUID;
  v_creator_id UUID;
  v_total_budget NUMERIC;
  v_slots_total INTEGER;
  v_base_payout NUMERIC;
  v_currency TEXT;
  v_payout_hold_days INTEGER;
BEGIN
  SELECT collab_id, creator_id INTO v_collab_id, v_creator_id
  FROM creator_deliverables WHERE id = p_deliverable_id;

  IF v_collab_id IS NULL THEN
    RETURN QUERY SELECT false, 'Deliverable not found';
    RETURN;
  END IF;

  IF NOT is_collab_owner(v_collab_id) THEN
    RETURN QUERY SELECT false, 'Not authorized to review this deliverable';
    RETURN;
  END IF;

  IF p_action = 'approve' THEN
    UPDATE creator_deliverables 
    SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = NOW(), 
        review_notes = p_notes, updated_at = NOW()
    WHERE id = p_deliverable_id;

    SELECT total_budget, slots_total, currency, payout_hold_days
    INTO v_total_budget, v_slots_total, v_currency, v_payout_hold_days
    FROM collaborations WHERE id = v_collab_id;

    IF v_total_budget IS NOT NULL AND v_slots_total IS NOT NULL AND v_slots_total > 0 THEN
      v_base_payout := v_total_budget / v_slots_total;
    ELSE
      v_base_payout := 0;
    END IF;

    INSERT INTO creator_payouts (
      collab_id, deliverable_id, creator_id, amount, currency, 
      payout_type, status, approved_at, hold_until
    )
    VALUES (
      v_collab_id, p_deliverable_id, v_creator_id, v_base_payout, 
      COALESCE(v_currency, 'AED'), 'base', 'owed', NOW(), 
      NOW() + (COALESCE(v_payout_hold_days, 7) || ' days')::INTERVAL
    )
    ON CONFLICT (deliverable_id, payout_type) DO NOTHING;

    RETURN QUERY SELECT true, 'Deliverable approved and payout created';

  ELSIF p_action = 'revision_requested' THEN
    UPDATE creator_deliverables 
    SET status = 'revision_requested', reviewed_by = auth.uid(), reviewed_at = NOW(), 
        review_notes = p_notes, updated_at = NOW()
    WHERE id = p_deliverable_id;
    RETURN QUERY SELECT true, 'Revision requested';

  ELSIF p_action = 'reject' THEN
    UPDATE creator_deliverables 
    SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = NOW(), 
        review_notes = p_notes, updated_at = NOW()
    WHERE id = p_deliverable_id;
    RETURN QUERY SELECT true, 'Deliverable rejected';

  ELSE
    RETURN QUERY SELECT false, 'Invalid action';
  END IF;
END;
$$;

-- 6) RPC: Update payout status
CREATE OR REPLACE FUNCTION update_payout_status(
  p_payout_id UUID,
  p_status TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_collab_id UUID;
  v_creator_id UUID;
  v_caller_id UUID := auth.uid();
BEGIN
  SELECT collab_id, creator_id INTO v_collab_id, v_creator_id
  FROM creator_payouts WHERE id = p_payout_id;

  IF v_collab_id IS NULL THEN
    RETURN QUERY SELECT false, 'Payout not found';
    RETURN;
  END IF;

  IF p_status IN ('paid', 'confirmed') THEN
    IF NOT is_collab_owner(v_collab_id) THEN
      RETURN QUERY SELECT false, 'Not authorized';
      RETURN;
    END IF;
    
    UPDATE creator_payouts 
    SET status = p_status::payout_status, 
        paid_at = CASE WHEN p_status = 'paid' THEN NOW() ELSE paid_at END,
        marked_by = v_caller_id,
        updated_at = NOW()
    WHERE id = p_payout_id;
    
    RETURN QUERY SELECT true, 'Payout status updated';

  ELSIF p_status = 'unpaid_issue' THEN
    IF v_creator_id != v_caller_id THEN
      RETURN QUERY SELECT false, 'Not authorized';
      RETURN;
    END IF;
    
    IF p_reason IS NULL OR p_reason = '' THEN
      RETURN QUERY SELECT false, 'Reason required for unpaid issue';
      RETURN;
    END IF;
    
    UPDATE creator_payouts 
    SET status = 'unpaid_issue'::payout_status, 
        marked_unpaid_reason = p_reason,
        marked_by = v_caller_id,
        updated_at = NOW()
    WHERE id = p_payout_id;
    
    RETURN QUERY SELECT true, 'Payout marked as unpaid issue';

  ELSE
    RETURN QUERY SELECT false, 'Invalid status';
  END IF;
END;
$$;

-- 7) RPC: Get screenshot path (for signed URL generation)
CREATE OR REPLACE FUNCTION get_deliverable_screenshot_path(p_deliverable_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_collab_id UUID;
  v_creator_id UUID;
  v_screenshot_path TEXT;
  v_caller_id UUID := auth.uid();
BEGIN
  SELECT collab_id, creator_id, screenshot_path 
  INTO v_collab_id, v_creator_id, v_screenshot_path
  FROM creator_deliverables WHERE id = p_deliverable_id;

  IF v_screenshot_path IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_creator_id != v_caller_id AND NOT is_collab_owner(v_collab_id) THEN
    RETURN NULL;
  END IF;

  RETURN v_screenshot_path;
END;
$$;

-- 8) RPC: Get waitlist position
CREATE OR REPLACE FUNCTION get_waitlist_position(p_collab_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT position::INTEGER
  FROM (
    SELECT 
      id,
      shopper_id,
      ROW_NUMBER() OVER (ORDER BY created_at ASC) as position
    FROM collab_applications
    WHERE collab_id = p_collab_id AND status = 'WAITLISTED'
  ) ranked
  WHERE shopper_id = auth.uid()
$$;