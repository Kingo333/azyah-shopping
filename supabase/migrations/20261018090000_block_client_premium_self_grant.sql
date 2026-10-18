-- Security fix: stop signed-in users from granting themselves premium.
--
-- Before this migration:
--   * profiles: the "Users can update own profile" policy plus column grants let any
--     signed-in user set is_premium / plan_type / premium_expires_at on their own row.
--   * subscriptions: "Users can insert/update their own subscription" let a user write
--     status = 'active' with a future current_period_end, which get_user_credits(),
--     get_user_ai_tryon_limit() and get_wardrobe_limit() treat as premium.
--
-- The existing policies stay, so users can still edit the other columns of their
-- own rows. These triggers only stop browser roles (anon / authenticated) from
-- *raising* privileges. Lowering them (cancel: is_premium=false, status='canceled')
-- is still allowed.
--
-- The service role (revenuecat-webhook, stripe-webhook, other edge functions) and
-- SECURITY DEFINER functions owned by postgres (e.g. handle_new_user_profile) run
-- as a different current_user and are not affected.

create or replace function public.guard_profile_premium_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if coalesce(new.is_premium, false) or new.plan_type is not null or new.premium_expires_at is not null then
      raise exception 'premium fields can only be set by the server'
        using errcode = '42501';
    end if;
    return new;
  end if;

  -- UPDATE: allow unchanged values, or a downgrade to the free state.
  if new.is_premium is distinct from old.is_premium and new.is_premium is not false then
    raise exception 'premium fields can only be set by the server' using errcode = '42501';
  end if;
  if new.plan_type is distinct from old.plan_type and new.plan_type is not null then
    raise exception 'premium fields can only be set by the server' using errcode = '42501';
  end if;
  if new.premium_expires_at is distinct from old.premium_expires_at and new.premium_expires_at is not null then
    raise exception 'premium fields can only be set by the server' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_profile_premium_fields on public.profiles;
create trigger guard_profile_premium_fields
  before insert or update on public.profiles
  for each row execute function public.guard_profile_premium_fields();


create or replace function public.guard_subscription_entitlement_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status in ('active', 'trialing') then
      raise exception 'active subscriptions can only be created by the server'
        using errcode = '42501';
    end if;
    return new;
  end if;

  -- UPDATE: a browser may cancel, or touch harmless columns, but may not turn a
  -- row active or change what an active row grants.
  if new.status in ('active', 'trialing') and (
       new.status is distinct from old.status
    or new.current_period_end is distinct from old.current_period_end
    or new.plan is distinct from old.plan
    or new.plan_tier is distinct from old.plan_tier
    or new.ai_tryon_limit is distinct from old.ai_tryon_limit
    or new.features_granted is distinct from old.features_granted
    or new.ugc_collaboration_enabled is distinct from old.ugc_collaboration_enabled
    or new.nail_salon_reward_eligible is distinct from old.nail_salon_reward_eligible
  ) then
    raise exception 'subscription entitlements can only be changed by the server'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_subscription_entitlement_fields on public.subscriptions;
create trigger guard_subscription_entitlement_fields
  before insert or update on public.subscriptions
  for each row execute function public.guard_subscription_entitlement_fields();
