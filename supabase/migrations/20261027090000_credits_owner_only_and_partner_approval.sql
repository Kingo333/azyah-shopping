-- Security follow-ups: own credits only; admin partner approval.
--
-- STATUS: PROPOSED. Not applied. Needs owner approval. Rename to the version
-- live records when applied.
-- Review: docs/redesign/SUPABASE_AUDIT.md (S15) and PARTNER_AND_EVENTS_REVIEW.md
--         (owner decision: partners approved manually).
-- Tests:  supabase/tests/followup_probes.sql (rollback mode on production).
-- Rollback: supabase/rollbacks/20261027090000_credits_owner_only_and_partner_approval.rollback.sql
--
-- 1. get_user_credits(target_user_id) could be called by anyone (even logged
--    out) for any user, and it creates or resets that user's credits row.
--    Now: signed-in users only for themselves; the server (service role) for
--    anyone. Every caller in the app and Edge Functions already passes the
--    user's own id or uses the service role.
-- 2. admin_set_partner_verification(kind, id, status): the only way to approve
--    or reject a brand/retailer. Admins (user_roles) and the server only.

begin;

create or replace function public.get_user_credits(target_user_id uuid)
 returns table(ai_studio_credits integer, beauty_credits integer, wardrobe_credits integer, video_credits integer, is_premium boolean)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
DECLARE
  user_credits_record RECORD;
  premium_status BOOLEAN := false;
  ai_limit INTEGER := 4;
  beauty_limit INTEGER := 4;
  wardrobe_limit INTEGER := 20;
  video_limit INTEGER := 1;
BEGIN
  -- Only your own credits (the server may read anyone's)
  IF coalesce(auth.jwt()->>'role', '') <> 'service_role'
     AND (auth.uid() IS NULL OR target_user_id IS DISTINCT FROM auth.uid()) THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;

  -- Check premium status
  SELECT EXISTS(
    SELECT 1 FROM subscriptions
    WHERE subscriptions.user_id = target_user_id
    AND status = 'active'
    AND current_period_end > NOW()
  ) INTO premium_status;

  -- Set limits based on premium status
  IF premium_status THEN
    ai_limit := 10;
    beauty_limit := 10;
    wardrobe_limit := 50;
    video_limit := 4;
  END IF;

  -- Get or create credits record
  SELECT * INTO user_credits_record
  FROM user_credits uc
  WHERE uc.user_id = target_user_id;

  -- Create record if doesn't exist
  IF user_credits_record IS NULL THEN
    INSERT INTO user_credits (
      user_id,
      ai_studio_credits,
      beauty_credits,
      wardrobe_credits,
      video_credits,
      last_reset_date
    )
    VALUES (
      target_user_id,
      ai_limit,
      beauty_limit,
      wardrobe_limit,
      video_limit,
      CURRENT_DATE
    )
    RETURNING * INTO user_credits_record;
  ELSE
    -- Reset if new day
    IF user_credits_record.last_reset_date < CURRENT_DATE THEN
      UPDATE user_credits uc
      SET
        ai_studio_credits = ai_limit,
        beauty_credits = beauty_limit,
        wardrobe_credits = wardrobe_limit,
        video_credits = video_limit,
        last_reset_date = CURRENT_DATE,
        updated_at = NOW()
      WHERE uc.user_id = target_user_id
      RETURNING * INTO user_credits_record;
    END IF;
  END IF;

  RETURN QUERY SELECT
    user_credits_record.ai_studio_credits,
    user_credits_record.beauty_credits,
    user_credits_record.wardrobe_credits,
    user_credits_record.video_credits,
    premium_status;
END;
$function$;

revoke execute on function public.get_user_credits(uuid) from public, anon;
grant execute on function public.get_user_credits(uuid) to authenticated, service_role;

create or replace function public.admin_set_partner_verification(partner_kind text, partner_id uuid, new_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.jwt()->>'role', '') <> 'service_role'
     and not exists (select 1 from public.user_roles ur
                     where ur.user_id = auth.uid() and ur.role = 'admin'::public.user_role) then
    raise exception 'Only admins can approve partners' using errcode = '42501';
  end if;
  if new_status not in ('pending', 'approved', 'rejected') then
    raise exception 'Unknown status %', new_status using errcode = '22023';
  end if;

  if partner_kind = 'brand' then
    update public.brands set verification_status = new_status, verification_updated_at = now() where id = partner_id;
  elsif partner_kind = 'retailer' then
    update public.retailers set verification_status = new_status, verification_updated_at = now() where id = partner_id;
  else
    raise exception 'Unknown partner kind %', partner_kind using errcode = '22023';
  end if;

  if not found then
    raise exception 'Partner not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.admin_set_partner_verification(text, uuid, text) from public, anon;
grant execute on function public.admin_set_partner_verification(text, uuid, text) to authenticated, service_role;

commit;
