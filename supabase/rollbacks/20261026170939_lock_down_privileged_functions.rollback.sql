-- ROLLBACK for 20261026170939_lock_down_privileged_functions.sql
-- Restores the previous (insecure) behaviour exactly. Run manually only if the
-- lockdown breaks something and a forward fix is not possible.
-- NOTE: kept outside supabase/migrations on purpose so it never runs as a
-- migration. Run it by hand (SQL editor) only if needed.

begin;

drop trigger if exists guard_users_role on public.users;
drop function if exists public.guard_users_role();

drop trigger if exists guard_user_credits on public.user_credits;
drop function if exists public.guard_user_credits();

create or replace function public.deduct_wardrobe_credit(target_user_id uuid, amount integer default 1)
returns boolean language plpgsql security definer set search_path to 'public'
as $function$
DECLARE
  current_credits INTEGER;
BEGIN
  SELECT wardrobe_credits INTO current_credits FROM user_credits WHERE user_id = target_user_id;
  IF current_credits IS NULL OR current_credits < amount THEN
    RETURN FALSE;
  END IF;
  UPDATE user_credits SET wardrobe_credits = wardrobe_credits - amount, updated_at = NOW()
  WHERE user_id = target_user_id;
  RETURN TRUE;
END;
$function$;

grant execute on function public.delete_user_completely(uuid) to public, anon, authenticated;
grant execute on function public.delete_user_completely(text) to public, anon, authenticated;
grant execute on function public.delete_user_completely(text, boolean) to public, anon, authenticated;
grant execute on function public.detect_orphaned_users() to public, anon, authenticated;
grant execute on function public.copy_default_wardrobe_items(uuid) to public, anon, authenticated;
grant execute on function public.cleanup_deals_cache() to public, anon, authenticated;
grant execute on function public.cleanup_expired_sessions() to public, anon, authenticated;
grant execute on function public.cleanup_old_ai_assets() to public, anon, authenticated;
grant execute on function public.cleanup_old_analytics(integer) to public, anon, authenticated;
grant execute on function public.cleanup_old_events() to public, anon, authenticated;
grant execute on function public.delete_expired_ai_assets() to public, anon, authenticated;
grant execute on function public.deduct_ai_studio_credit(uuid) to public, anon, authenticated;
grant execute on function public.deduct_beauty_credit(uuid) to public, anon, authenticated;
grant execute on function public.deduct_user_credit(uuid) to public, anon, authenticated;
grant execute on function public.deduct_video_credit(uuid, integer) to public, anon, authenticated;
grant execute on function public.deduct_wardrobe_credit(uuid, integer) to public, anon, authenticated;
grant execute on function public.create_admin_user() to public, anon, authenticated;
grant execute on function public.redeem_points_for_credits(uuid, text, integer, integer) to public, anon, authenticated;

create or replace function public.sync_user_role_with_metadata()
returns trigger language plpgsql security definer set search_path to 'public'
as $function$
BEGIN
  IF NEW.raw_user_meta_data IS DISTINCT FROM OLD.raw_user_meta_data THEN
    UPDATE public.users
    SET
      role = COALESCE((NEW.raw_user_meta_data->>'role')::user_role, role),
      name = COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', name),
      avatar_url = COALESCE(NEW.raw_user_meta_data->>'avatar_url', avatar_url),
      updated_at = NOW(),
      last_sign_in_at = NOW()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

create or replace function public.handle_new_user_role()
returns trigger language plpgsql security definer set search_path to 'public'
as $function$
DECLARE
  new_role user_role;
BEGIN
  new_role := COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'shopper'::user_role);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, new_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user_role trigger: % %', SQLERRM, SQLSTATE;
    BEGIN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'shopper'::user_role)
      ON CONFLICT (user_id, role) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    RETURN NEW;
END;
$function$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path to 'public'
as $function$
DECLARE
  detected_role text;
  detected_provider text;
  user_name text;
  user_avatar text;
BEGIN
  detected_role := COALESCE(NEW.raw_user_meta_data->>'role', 'shopper');
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
  VALUES (NEW.id, NEW.email, detected_role::user_role, detected_provider, user_name, user_avatar, false, NOW(), NOW())
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

create or replace function public.redeem_points_for_credits(target_user_id uuid, credit_type text, credit_amount integer, points_cost integer)
returns boolean language plpgsql security definer set search_path to 'public'
as $function$
DECLARE
  current_balance INTEGER;
BEGIN
  IF credit_type NOT IN ('ai_studio', 'beauty', 'video') THEN
    RAISE EXCEPTION 'Invalid credit type: %', credit_type;
  END IF;
  SELECT COALESCE(SUM(CASE WHEN type = 'earn' THEN amount ELSE -amount END), 0)
  INTO current_balance FROM points_ledger WHERE user_id = target_user_id;
  IF current_balance < points_cost THEN
    RAISE EXCEPTION 'Insufficient points balance. Have: %, Need: %', current_balance, points_cost;
  END IF;
  INSERT INTO points_ledger (user_id, type, action_type, amount, metadata, idempotency_key)
  VALUES (target_user_id, 'spend', 'credit_redemption', points_cost,
    jsonb_build_object('credit_type', credit_type, 'credit_amount', credit_amount),
    'credit_redeem_' || target_user_id || '_' || credit_type || '_' || EXTRACT(EPOCH FROM now())::TEXT);
  IF credit_type = 'ai_studio' THEN
    UPDATE user_credits SET bonus_ai_credits = COALESCE(bonus_ai_credits, 0) + credit_amount, updated_at = now() WHERE user_id = target_user_id;
  ELSIF credit_type = 'beauty' THEN
    UPDATE user_credits SET bonus_beauty_credits = COALESCE(bonus_beauty_credits, 0) + credit_amount, updated_at = now() WHERE user_id = target_user_id;
  ELSIF credit_type = 'video' THEN
    UPDATE user_credits SET bonus_video_credits = COALESCE(bonus_video_credits, 0) + credit_amount, updated_at = now() WHERE user_id = target_user_id;
  END IF;
  IF NOT FOUND THEN
    INSERT INTO user_credits (user_id, bonus_ai_credits, bonus_beauty_credits, bonus_video_credits)
    VALUES (target_user_id,
      CASE WHEN credit_type = 'ai_studio' THEN credit_amount ELSE 0 END,
      CASE WHEN credit_type = 'beauty' THEN credit_amount ELSE 0 END,
      CASE WHEN credit_type = 'video' THEN credit_amount ELSE 0 END);
  END IF;
  RETURN TRUE;
END;
$function$;

commit;
