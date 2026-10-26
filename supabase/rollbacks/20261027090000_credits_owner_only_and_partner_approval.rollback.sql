-- ROLLBACK for 20261027090000_credits_owner_only_and_partner_approval.sql
-- Restores get_user_credits exactly as it was on 2026-10-26 (anyone could
-- call it for any user) and removes admin_set_partner_verification.

begin;

drop function if exists public.admin_set_partner_verification(text, uuid, text);

CREATE OR REPLACE FUNCTION public.get_user_credits(target_user_id uuid)
 RETURNS TABLE(ai_studio_credits integer, beauty_credits integer, wardrobe_credits integer, video_credits integer, is_premium boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_credits_record RECORD;
  premium_status BOOLEAN := false;
  ai_limit INTEGER := 4;
  beauty_limit INTEGER := 4;
  wardrobe_limit INTEGER := 20;
  video_limit INTEGER := 1;
BEGIN
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

grant execute on function public.get_user_credits(uuid) to public, anon, authenticated;

commit;
