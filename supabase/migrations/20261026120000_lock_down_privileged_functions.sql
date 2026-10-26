-- Lock down privileged database functions and role assignment.
--
-- STATUS: PROPOSED. Not applied to the live project. Needs owner approval.
-- See docs/redesign/SUPABASE_AUDIT.md (findings S1-S4) for the evidence.
--
-- What this fixes:
--   S1  delete_user_completely(...) and other maintenance functions were
--       SECURITY DEFINER and executable by anon/authenticated with no caller
--       check, so anyone with the public app key could delete any user's data.
--   S2  Signed-in users could UPDATE their own public.users.role (RLS policy
--       users_can_update_own_data_only has no column restriction), and
--       get_current_user_role() trusts that column, unlocking admin_* functions.
--   S3  Role came from user-editable metadata: at signup (handle_new_user,
--       handle_new_user_role) and on every metadata change
--       (sync_user_role_with_metadata). 'admin' was accepted.
--   S4  redeem_points_for_credits took target_user_id, credit_amount and
--       points_cost from the client, so a caller could grant credits to anyone
--       for any number of points. (A negative points_cost is already
--       blocked by the points_ledger CHECK (amount > 0).)
--   S4b Users could edit their own user_credits row directly (credit
--       amounts, last_reset_date). Added in session 2.
--   S4c deduct_wardrobe_credit accepted any user and negative amounts.
--       Added in session 2.
--
-- Tests: supabase/tests/security_lockdown_probes.sql (run on a branch only).
--
-- Callers checked (2026-10-26):
--   delete_user_completely: only edge functions delete-account and
--     admin-delete-user, both via the service-role client.
--   deduct_ai_studio_credit / deduct_video_credit / deduct_beauty_credit:
--     only edge functions via the service-role client.
--   deduct_wardrobe_credit: edge function enhance-wardrobe-item calls it with
--     the USER's JWT, so it is NOT revoked from authenticated here. Follow-up:
--     switch that call to the service client, then revoke.
--   detect_orphaned_users: only the unused admin component OrphanedUsersManager.
--   redeem_points_for_credits: src/components/rewards/CreditRedemptionCard.tsx
--     (passes the caller's own id and fixed package values, which the new
--     checks below accept).
--
-- Rollback: supabase/rollbacks/20261026120000_lock_down_privileged_functions.rollback.sql

begin;

-- ---------------------------------------------------------------------------
-- S1. Service-only functions: remove from the public API surface.
-- service_role keeps EXECUTE (it is granted separately by Supabase defaults).
-- ---------------------------------------------------------------------------
revoke execute on function public.delete_user_completely(uuid) from public, anon, authenticated;
revoke execute on function public.delete_user_completely(text) from public, anon, authenticated;
revoke execute on function public.delete_user_completely(text, boolean) from public, anon, authenticated;
revoke execute on function public.detect_orphaned_users() from public, anon, authenticated;
revoke execute on function public.copy_default_wardrobe_items(uuid) from public, anon, authenticated;
revoke execute on function public.cleanup_deals_cache() from public, anon, authenticated;
revoke execute on function public.cleanup_expired_sessions() from public, anon, authenticated;
revoke execute on function public.cleanup_old_ai_assets() from public, anon, authenticated;
revoke execute on function public.cleanup_old_analytics(integer) from public, anon, authenticated;
revoke execute on function public.cleanup_old_events() from public, anon, authenticated;
revoke execute on function public.delete_expired_ai_assets() from public, anon, authenticated;
revoke execute on function public.deduct_ai_studio_credit(uuid) from public, anon, authenticated;
revoke execute on function public.deduct_beauty_credit(uuid) from public, anon, authenticated;
revoke execute on function public.deduct_user_credit(uuid) from public, anon, authenticated;
revoke execute on function public.deduct_video_credit(uuid, integer) from public, anon, authenticated;
revoke execute on function public.deduct_wardrobe_credit(uuid, integer) from public, anon;
revoke execute on function public.create_admin_user() from public, anon, authenticated;

grant execute on function public.delete_user_completely(uuid) to service_role;
grant execute on function public.delete_user_completely(text) to service_role;
grant execute on function public.delete_user_completely(text, boolean) to service_role;
grant execute on function public.detect_orphaned_users() to service_role;
grant execute on function public.copy_default_wardrobe_items(uuid) to service_role;
grant execute on function public.deduct_ai_studio_credit(uuid) to service_role;
grant execute on function public.deduct_beauty_credit(uuid) to service_role;
grant execute on function public.deduct_user_credit(uuid) to service_role;
grant execute on function public.deduct_video_credit(uuid, integer) to service_role;
grant execute on function public.deduct_wardrobe_credit(uuid, integer) to service_role;

-- ---------------------------------------------------------------------------
-- S2. public.users.role can only be changed by the server.
-- Same pattern as guard_profile_premium_fields (20261018090000).
-- SECURITY DEFINER triggers and the service role run as other roles, so they
-- are unaffected.
-- ---------------------------------------------------------------------------
create or replace function public.guard_users_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- A client may only create its own row as a shopper.
    if new.role is not null and new.role <> 'shopper'::public.user_role then
      raise exception 'role can only be set by the server' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'role can only be set by the server' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_users_role on public.users;
create trigger guard_users_role
  before insert or update on public.users
  for each row execute function public.guard_users_role();

-- ---------------------------------------------------------------------------
-- S3. Never take 'admin' from user metadata, and stop syncing role from
-- metadata after signup. Brand/retailer self-selection at signup is kept
-- for now (product decision pending: partner verification).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
  detected_role text;
  detected_provider text;
  user_name text;
  user_avatar text;
BEGIN
  detected_role := COALESCE(NEW.raw_user_meta_data->>'role', 'shopper');
  -- Only self-selectable roles are accepted from metadata.
  IF detected_role NOT IN ('shopper', 'brand', 'retailer') THEN
    detected_role := 'shopper';
  END IF;
  detected_provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');

  user_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), '')
  );

  user_avatar := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'avatar_url'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'picture'), '')
  );

  INSERT INTO public.users (id, email, role, provider, name, avatar_url, onboarding_completed, created_at, updated_at)
  VALUES (
    NEW.id, NEW.email, detected_role::user_role, detected_provider,
    user_name, user_avatar, false, NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(users.email, EXCLUDED.email),
    provider = COALESCE(users.provider, EXCLUDED.provider),
    role = COALESCE(users.role, EXCLUDED.role),
    name = COALESCE(users.name, EXCLUDED.name),
    avatar_url = COALESCE(users.avatar_url, EXCLUDED.avatar_url),
    updated_at = NOW();

  IF detected_role = 'shopper' THEN
    PERFORM copy_default_wardrobe_items(NEW.id);
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user trigger: % %', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$function$;

create or replace function public.handle_new_user_role()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
  meta_role text;
  new_role user_role;
BEGIN
  meta_role := COALESCE(NEW.raw_user_meta_data->>'role', 'shopper');
  IF meta_role NOT IN ('shopper', 'brand', 'retailer') THEN
    meta_role := 'shopper';
  END IF;
  new_role := meta_role::user_role;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, new_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user_role trigger: % %', SQLERRM, SQLSTATE;
    BEGIN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'shopper'::user_role)
      ON CONFLICT (user_id, role) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    RETURN NEW;
END;
$function$;

-- Keep name/avatar sync; drop the role sync (metadata is user-editable).
create or replace function public.sync_user_role_with_metadata()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
BEGIN
  IF NEW.raw_user_meta_data IS DISTINCT FROM OLD.raw_user_meta_data THEN
    UPDATE public.users
    SET
      name = COALESCE(
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'full_name',
        name
      ),
      avatar_url = COALESCE(NEW.raw_user_meta_data->>'avatar_url', avatar_url),
      updated_at = NOW(),
      last_sign_in_at = NOW()
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- S4. Points redemption: caller can only redeem for themselves, and only the
-- packages the app offers. Signature kept so the current client keeps working.
-- ---------------------------------------------------------------------------
create or replace function public.redeem_points_for_credits(
  target_user_id uuid,
  credit_type text,
  credit_amount integer,
  points_cost integer
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
  current_balance INTEGER;
BEGIN
  IF auth.uid() IS NULL OR target_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;

  -- Server-side package list. Must match CreditRedemptionCard.tsx.
  IF NOT (
       (credit_type = 'ai_studio' AND credit_amount = 2 AND points_cost = 100)
    OR (credit_type = 'ai_studio' AND credit_amount = 5 AND points_cost = 200)
    OR (credit_type = 'video'     AND credit_amount = 1 AND points_cost = 250)
  ) THEN
    RAISE EXCEPTION 'Unknown redemption package' USING ERRCODE = '22023';
  END IF;

  -- Serialise redemptions per user so two parallel calls cannot overspend.
  PERFORM pg_advisory_xact_lock(hashtext('redeem_points:' || target_user_id::text));

  SELECT COALESCE(SUM(CASE WHEN type = 'earn' THEN amount ELSE -amount END), 0)
  INTO current_balance
  FROM points_ledger
  WHERE user_id = target_user_id;

  IF current_balance < points_cost THEN
    RAISE EXCEPTION 'Insufficient points balance. Have: %, Need: %', current_balance, points_cost;
  END IF;

  INSERT INTO points_ledger (user_id, type, action_type, amount, metadata, idempotency_key)
  VALUES (
    target_user_id, 'spend', 'credit_redemption', points_cost,
    jsonb_build_object('credit_type', credit_type, 'credit_amount', credit_amount),
    'credit_redeem_' || target_user_id || '_' || credit_type || '_' || EXTRACT(EPOCH FROM clock_timestamp())::TEXT
  );

  IF credit_type = 'ai_studio' THEN
    UPDATE user_credits
    SET bonus_ai_credits = COALESCE(bonus_ai_credits, 0) + credit_amount, updated_at = now()
    WHERE user_id = target_user_id;
  ELSIF credit_type = 'video' THEN
    UPDATE user_credits
    SET bonus_video_credits = COALESCE(bonus_video_credits, 0) + credit_amount, updated_at = now()
    WHERE user_id = target_user_id;
  END IF;

  IF NOT FOUND THEN
    INSERT INTO user_credits (user_id, bonus_ai_credits, bonus_beauty_credits, bonus_video_credits)
    VALUES (
      target_user_id,
      CASE WHEN credit_type = 'ai_studio' THEN credit_amount ELSE 0 END,
      0,
      CASE WHEN credit_type = 'video' THEN credit_amount ELSE 0 END
    );
  END IF;

  RETURN TRUE;
END;
$function$;

revoke execute on function public.redeem_points_for_credits(uuid, text, integer, integer) from public, anon;
grant execute on function public.redeem_points_for_credits(uuid, text, integer, integer) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- S4b. Users could edit their own user_credits row directly (RLS policies
-- "Users can insert/update their own credits", no column limits), e.g.
-- ai_studio_credits = 999, or backdate last_reset_date so get_user_credits
-- refills everything. The bg-remove edge function writes this table with the
-- user's login, so instead of removing the policies, guard the columns:
--   - credit amounts: server only
--   - last_reset_date: may only be set to today
--   - bg_removals_used_monthly: may go up; may go back to 0 only when the
--     row moves into a new month (what bg-remove does)
--   - insert: only a default row
-- Same pattern as guard_profile_premium_fields. SECURITY DEFINER functions
-- and the service role run as other roles, so they are unaffected.
-- ---------------------------------------------------------------------------
create or replace function public.guard_user_credits()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if coalesce(new.credits_remaining, 4) <> 4
       or coalesce(new.credits_used_today, 0) <> 0
       or coalesce(new.ai_studio_credits, 4) <> 4
       or coalesce(new.beauty_credits, 4) <> 4
       or coalesce(new.wardrobe_credits, 20) <> 20
       or coalesce(new.video_credits, 1) <> 1
       or coalesce(new.bonus_ai_credits, 0) <> 0
       or coalesce(new.bonus_beauty_credits, 0) <> 0
       or coalesce(new.bonus_video_credits, 0) <> 0
       or coalesce(new.bg_removals_used_monthly, 0) <> 0
       or coalesce(new.bg_removals_quota_monthly, 30) <> 30
       or coalesce(new.last_reset_date, current_date) <> current_date then
      raise exception 'credits can only be set by the server' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.user_id is distinct from old.user_id
     or new.credits_remaining is distinct from old.credits_remaining
     or new.credits_used_today is distinct from old.credits_used_today
     or new.ai_studio_credits is distinct from old.ai_studio_credits
     or new.beauty_credits is distinct from old.beauty_credits
     or new.wardrobe_credits is distinct from old.wardrobe_credits
     or new.video_credits is distinct from old.video_credits
     or new.bonus_ai_credits is distinct from old.bonus_ai_credits
     or new.bonus_beauty_credits is distinct from old.bonus_beauty_credits
     or new.bonus_video_credits is distinct from old.bonus_video_credits
     or new.bg_removals_quota_monthly is distinct from old.bg_removals_quota_monthly then
    raise exception 'credits can only be set by the server' using errcode = '42501';
  end if;

  if new.last_reset_date is distinct from old.last_reset_date
     and new.last_reset_date is distinct from current_date then
    raise exception 'credits can only be set by the server' using errcode = '42501';
  end if;

  if coalesce(new.bg_removals_used_monthly, 0) < coalesce(old.bg_removals_used_monthly, 0)
     and not (
       new.last_reset_date = current_date
       and date_trunc('month', old.last_reset_date) < date_trunc('month', current_date)
     ) then
    raise exception 'credits can only be set by the server' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_user_credits on public.user_credits;
create trigger guard_user_credits
  before insert or update on public.user_credits
  for each row execute function public.guard_user_credits();

-- ---------------------------------------------------------------------------
-- S4c. deduct_wardrobe_credit stays callable by signed-in users (see header),
-- but it accepted any target user and a negative amount ("deduct -100" adds
-- 100). Now: positive amounts only, and a user may only deduct their own
-- credits. The service role may deduct for anyone.
-- ---------------------------------------------------------------------------
create or replace function public.deduct_wardrobe_credit(target_user_id uuid, amount integer default 1)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
  current_credits INTEGER;
BEGIN
  IF amount IS NULL OR amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive' USING ERRCODE = '22023';
  END IF;

  IF coalesce(auth.jwt()->>'role', '') <> 'service_role'
     AND target_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;

  SELECT wardrobe_credits INTO current_credits
  FROM user_credits
  WHERE user_id = target_user_id;

  IF current_credits IS NULL OR current_credits < amount THEN
    RETURN FALSE;
  END IF;

  UPDATE user_credits
  SET
    wardrobe_credits = wardrobe_credits - amount,
    updated_at = NOW()
  WHERE user_id = target_user_id;

  RETURN TRUE;
END;
$function$;

revoke execute on function public.deduct_wardrobe_credit(uuid, integer) from public, anon;
grant execute on function public.deduct_wardrobe_credit(uuid, integer) to authenticated, service_role;

commit;
