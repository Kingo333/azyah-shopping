-- Security probes for 20261026120000_lock_down_privileged_functions.sql
--
-- RUN ONLY ON A SUPABASE BRANCH, never on production. It creates and deletes
-- five test accounts (emails end in @probe.example.test) and runs attacks
-- against them.
--
-- How to run: paste the whole file into the SQL editor (or MCP execute_sql)
-- on the branch. The last statement returns one row per probe with
-- pass = true/false. Before the migration, the attack probes should FAIL
-- (that proves they detect the holes). After the migration, every row should
-- pass.
--
-- Each probe runs as a real API role (anon / authenticated / service_role)
-- with the same JWT claims PostgREST would set, inside a sub-transaction.

-- ---------------------------------------------------------------------------
-- Results table and helpers (temporary, disappear with the session)
-- ---------------------------------------------------------------------------
drop table if exists pg_temp.probe_results;
create temp table probe_results (
  seq serial primary key,
  area text,
  probe text,
  expect text,       -- 'ok' = must work, 'deny' = must be blocked
  outcome text,
  pass boolean
);

-- probe(): run `sql` as `as_role` (anon | authenticated | service_role).
-- `effect_sql` (optional) runs afterwards as the owner and returns true if
-- the action took effect. 'deny' passes when the call raised an error or had
-- no effect. 'ok' passes when it did not raise and (if given) took effect.
create or replace function pg_temp.probe(
  area text, probe text, expect text, as_role text, uid uuid,
  sql text, effect_sql text default null
) returns void
language plpgsql as $$
declare
  raised text := null;
  effect boolean := null;
  outcome text;
  ok boolean;
begin
  begin
    perform set_config('request.jwt.claims',
      case when uid is null then json_build_object('role', as_role)::text
           else json_build_object('sub', uid, 'role', as_role)::text end, true);
    execute format('set local role %I', as_role);
    execute sql;
    reset role;
  exception when others then
    raised := sqlstate || ' ' || left(sqlerrm, 80);
  end;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  if raised is null and effect_sql is not null then
    execute effect_sql into effect;
  end if;

  if raised is not null then
    outcome := 'error: ' || raised;
  elsif effect is false then
    outcome := 'no effect';
  else
    outcome := 'worked';
  end if;

  ok := case
    when expect = 'deny' then raised is not null or effect is false
    else raised is null and coalesce(effect, true)
  end;

  insert into probe_results(area, probe, expect, outcome, pass)
  values (area, probe, expect, outcome, ok);
end;
$$;

-- check(): record a plain true/false fact.
create or replace function pg_temp.check_fact(area text, probe text, fact boolean)
returns void language sql as $$
  insert into probe_results(area, probe, expect, outcome, pass)
  values (area, probe, 'ok', case when fact then 'true' else 'false' end, coalesce(fact, false));
$$;

-- ---------------------------------------------------------------------------
-- Test accounts
--   A  attacker (shopper)        V  victim (shopper)
--   M  signs up with role=admin  B  signs up with role=brand
--   E  used for insert and account-deletion probes
-- ---------------------------------------------------------------------------
create or replace function pg_temp.cleanup() returns void language plpgsql as $$
declare
  ids uuid[] := array[
    '00000000-0000-4000-a000-00000000000a', '00000000-0000-4000-a000-00000000000b',
    '00000000-0000-4000-a000-00000000000c', '00000000-0000-4000-a000-00000000000d',
    '00000000-0000-4000-a000-00000000000e']::uuid[];
  t text;
begin
  foreach t in array array['points_ledger','user_credits','user_roles','wardrobe_items','profiles','users'] loop
    begin
      execute format('delete from public.%I where %I = any($1)', t,
        case when t in ('profiles','users') then 'id' else 'user_id' end) using ids;
    exception when others then null;
    end;
  end loop;
  delete from auth.users where id = any(ids);
end;
$$;

select pg_temp.cleanup();

insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-00000000000a', 'authenticated', 'authenticated',
   'a@probe.example.test', '', '{"provider":"email"}', '{"role":"shopper","name":"Probe A"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-00000000000b', 'authenticated', 'authenticated',
   'v@probe.example.test', '', '{"provider":"email"}', '{"role":"shopper","name":"Probe V"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-00000000000c', 'authenticated', 'authenticated',
   'm@probe.example.test', '', '{"provider":"email"}', '{"role":"admin","name":"Probe M"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-00000000000d', 'authenticated', 'authenticated',
   'b@probe.example.test', '', '{"provider":"email"}', '{"role":"brand","name":"Probe B"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-00000000000e', 'authenticated', 'authenticated',
   'e@probe.example.test', '', '{"provider":"email"}', '{"role":"shopper","name":"Probe E"}', now(), now());

-- Known starting credits and points for A and V.
delete from public.user_credits where user_id in ('00000000-0000-4000-a000-00000000000a', '00000000-0000-4000-a000-00000000000b');
insert into public.user_credits (user_id, ai_studio_credits, wardrobe_credits, bonus_ai_credits, bonus_video_credits,
                                 bg_removals_used_monthly, last_reset_date)
values ('00000000-0000-4000-a000-00000000000a', 4, 20, 0, 0, 0, current_date),
       ('00000000-0000-4000-a000-00000000000b', 4, 20, 0, 0, 0, current_date);
insert into public.points_ledger (user_id, type, action_type, amount, idempotency_key)
values ('00000000-0000-4000-a000-00000000000a', 'earn', 'daily_checkin', 300, 'probe-seed-a');

-- ---------------------------------------------------------------------------
-- S3. Signup and metadata
-- ---------------------------------------------------------------------------
select pg_temp.check_fact('S3 signup', 'shopper signup creates users + profiles + user_roles rows',
  exists (select 1 from public.users where id = '00000000-0000-4000-a000-00000000000a' and role = 'shopper')
  and exists (select 1 from public.profiles where id = '00000000-0000-4000-a000-00000000000a')
  and exists (select 1 from public.user_roles where user_id = '00000000-0000-4000-a000-00000000000a' and role = 'shopper'));
select pg_temp.check_fact('S3 signup', 'signup with role=admin metadata becomes shopper (users)',
  (select role::text from public.users where id = '00000000-0000-4000-a000-00000000000c') = 'shopper');
select pg_temp.check_fact('S3 signup', 'signup with role=admin metadata gets no admin row (user_roles)',
  not exists (select 1 from public.user_roles where user_id = '00000000-0000-4000-a000-00000000000c' and role = 'admin'));
select pg_temp.check_fact('S3 signup', 'signup with role=brand still becomes brand (kept for now)',
  (select role::text from public.users where id = '00000000-0000-4000-a000-00000000000d') = 'brand');

-- ---------------------------------------------------------------------------
-- S2. Role column
-- ---------------------------------------------------------------------------
select pg_temp.probe('S2 role', 'user sets own users.role = admin', 'deny', 'authenticated',
  '00000000-0000-4000-a000-00000000000a',
  $q$update public.users set role = 'admin' where id = '00000000-0000-4000-a000-00000000000a'$q$,
  $q$select role::text = 'admin' from public.users where id = '00000000-0000-4000-a000-00000000000a'$q$);
update public.users set role = 'shopper' where id = '00000000-0000-4000-a000-00000000000a';

select pg_temp.probe('S2 role', 'user still edits own name', 'ok', 'authenticated',
  '00000000-0000-4000-a000-00000000000a',
  $q$update public.users set name = 'Probe A edited' where id = '00000000-0000-4000-a000-00000000000a'$q$,
  $q$select name = 'Probe A edited' from public.users where id = '00000000-0000-4000-a000-00000000000a'$q$);

delete from public.users where id = '00000000-0000-4000-a000-00000000000e';
select pg_temp.probe('S2 role', 'user inserts own users row as brand', 'deny', 'authenticated',
  '00000000-0000-4000-a000-00000000000e',
  $q$insert into public.users (id, email, role) values ('00000000-0000-4000-a000-00000000000e', 'e@probe.example.test', 'brand')$q$,
  $q$select exists (select 1 from public.users where id = '00000000-0000-4000-a000-00000000000e' and role = 'brand')$q$);
delete from public.users where id = '00000000-0000-4000-a000-00000000000e';
select pg_temp.probe('S2 role', 'user inserts own users row as shopper', 'ok', 'authenticated',
  '00000000-0000-4000-a000-00000000000e',
  $q$insert into public.users (id, email, role) values ('00000000-0000-4000-a000-00000000000e', 'e@probe.example.test', 'shopper')$q$,
  $q$select exists (select 1 from public.users where id = '00000000-0000-4000-a000-00000000000e' and role = 'shopper')$q$);

-- ---------------------------------------------------------------------------
-- S1. Service-only functions are not callable by the public key or users
-- ---------------------------------------------------------------------------
do $$
declare
  f text;
  fns text[] := array[
    'public.delete_user_completely(uuid)', 'public.delete_user_completely(text)',
    'public.delete_user_completely(text, boolean)', 'public.detect_orphaned_users()',
    'public.copy_default_wardrobe_items(uuid)', 'public.cleanup_deals_cache()',
    'public.cleanup_expired_sessions()', 'public.cleanup_old_ai_assets()',
    'public.cleanup_old_analytics(integer)', 'public.cleanup_old_events()',
    'public.delete_expired_ai_assets()', 'public.deduct_ai_studio_credit(uuid)',
    'public.deduct_beauty_credit(uuid)', 'public.deduct_user_credit(uuid)',
    'public.deduct_video_credit(uuid, integer)', 'public.create_admin_user()'];
begin
  foreach f in array fns loop
    perform pg_temp.check_fact('S1 grants', f || ' not executable by anon or authenticated',
      not has_function_privilege('anon', f, 'execute')
      and not has_function_privilege('authenticated', f, 'execute'));
    perform pg_temp.check_fact('S1 grants', f || ' still executable by service_role',
      has_function_privilege('service_role', f, 'execute'));
  end loop;
end $$;

select pg_temp.probe('S1 call', 'anon calls delete_user_completely(victim)', 'deny', 'anon', null,
  $q$select public.delete_user_completely('00000000-0000-4000-a000-00000000000b'::uuid)$q$,
  $q$select not exists (select 1 from public.users where id = '00000000-0000-4000-a000-00000000000b')$q$);
select pg_temp.probe('S1 call', 'user calls deduct_ai_studio_credit(victim)', 'deny', 'authenticated',
  '00000000-0000-4000-a000-00000000000a',
  $q$select public.deduct_ai_studio_credit('00000000-0000-4000-a000-00000000000b'::uuid)$q$,
  $q$select ai_studio_credits < 4 from public.user_credits where user_id = '00000000-0000-4000-a000-00000000000b'$q$);

-- Real flow: picture try-on edge functions deduct with the service role.
select pg_temp.probe('Flows', 'picture try-on: service role deducts an AI credit', 'ok', 'service_role', null,
  $q$select public.deduct_ai_studio_credit('00000000-0000-4000-a000-00000000000a'::uuid)$q$,
  $q$select ai_studio_credits = 3 from public.user_credits where user_id = '00000000-0000-4000-a000-00000000000a'$q$);

-- ---------------------------------------------------------------------------
-- S4. Points redemption
-- ---------------------------------------------------------------------------
select pg_temp.probe('S4 redeem', 'anon redeems for a user', 'deny', 'anon', null,
  $q$select public.redeem_points_for_credits('00000000-0000-4000-a000-00000000000a', 'ai_studio', 2, 100)$q$,
  $q$select coalesce(bonus_ai_credits, 0) > 0 from public.user_credits where user_id = '00000000-0000-4000-a000-00000000000a'$q$);
select pg_temp.probe('S4 redeem', 'user redeems into another user''s account', 'deny', 'authenticated',
  '00000000-0000-4000-a000-00000000000a',
  $q$select public.redeem_points_for_credits('00000000-0000-4000-a000-00000000000b', 'ai_studio', 2, 100)$q$,
  $q$select coalesce(bonus_ai_credits, 0) > 0 from public.user_credits where user_id = '00000000-0000-4000-a000-00000000000b'$q$);
select pg_temp.probe('S4 redeem', 'user redeems a fake package (1000 credits for 100 points)', 'deny', 'authenticated',
  '00000000-0000-4000-a000-00000000000a',
  $q$select public.redeem_points_for_credits('00000000-0000-4000-a000-00000000000a', 'ai_studio', 1000, 100)$q$,
  $q$select coalesce(bonus_ai_credits, 0) >= 1000 from public.user_credits where user_id = '00000000-0000-4000-a000-00000000000a'$q$);
update public.user_credits set bonus_ai_credits = 0 where user_id = '00000000-0000-4000-a000-00000000000a';
select pg_temp.probe('S4 redeem', 'user redeems a real package (2 AI credits for 100 points)', 'ok', 'authenticated',
  '00000000-0000-4000-a000-00000000000a',
  $q$select public.redeem_points_for_credits('00000000-0000-4000-a000-00000000000a', 'ai_studio', 2, 100)$q$,
  $q$select coalesce(bonus_ai_credits, 0) = 2 from public.user_credits where user_id = '00000000-0000-4000-a000-00000000000a'$q$);

-- ---------------------------------------------------------------------------
-- S4b. Direct edits to the user's own credits row (bg-remove writes this
-- table with the user's login, so some columns must stay writable)
-- ---------------------------------------------------------------------------
select pg_temp.probe('S4b credits', 'user sets own ai_studio_credits = 999', 'deny', 'authenticated',
  '00000000-0000-4000-a000-00000000000a',
  $q$update public.user_credits set ai_studio_credits = 999 where user_id = '00000000-0000-4000-a000-00000000000a'$q$,
  $q$select ai_studio_credits = 999 from public.user_credits where user_id = '00000000-0000-4000-a000-00000000000a'$q$);
select pg_temp.probe('S4b credits', 'user sets own bonus_video_credits = 50', 'deny', 'authenticated',
  '00000000-0000-4000-a000-00000000000a',
  $q$update public.user_credits set bonus_video_credits = 50 where user_id = '00000000-0000-4000-a000-00000000000a'$q$,
  $q$select bonus_video_credits = 50 from public.user_credits where user_id = '00000000-0000-4000-a000-00000000000a'$q$);
select pg_temp.probe('S4b credits', 'user backdates last_reset_date to force a refill', 'deny', 'authenticated',
  '00000000-0000-4000-a000-00000000000a',
  $q$update public.user_credits set last_reset_date = date '2000-01-01' where user_id = '00000000-0000-4000-a000-00000000000a'$q$,
  $q$select last_reset_date = date '2000-01-01' from public.user_credits where user_id = '00000000-0000-4000-a000-00000000000a'$q$);
update public.user_credits set last_reset_date = current_date where user_id = '00000000-0000-4000-a000-00000000000a';
select pg_temp.probe('Flows', 'bg-remove: user counts one background removal', 'ok', 'authenticated',
  '00000000-0000-4000-a000-00000000000a',
  $q$update public.user_credits set bg_removals_used_monthly = coalesce(bg_removals_used_monthly, 0) + 1 where user_id = '00000000-0000-4000-a000-00000000000a'$q$,
  $q$select bg_removals_used_monthly = 1 from public.user_credits where user_id = '00000000-0000-4000-a000-00000000000a'$q$);
select pg_temp.probe('S4b credits', 'user resets own bg-removal count mid-month', 'deny', 'authenticated',
  '00000000-0000-4000-a000-00000000000a',
  $q$update public.user_credits set bg_removals_used_monthly = 0 where user_id = '00000000-0000-4000-a000-00000000000a'$q$,
  $q$select bg_removals_used_monthly = 0 from public.user_credits where user_id = '00000000-0000-4000-a000-00000000000a'$q$);
update public.user_credits set last_reset_date = (date_trunc('month', current_date) - interval '1 day')::date
  where user_id = '00000000-0000-4000-a000-00000000000a';
select pg_temp.probe('Flows', 'bg-remove: monthly reset in a new month', 'ok', 'authenticated',
  '00000000-0000-4000-a000-00000000000a',
  $q$update public.user_credits set bg_removals_used_monthly = 0, last_reset_date = current_date where user_id = '00000000-0000-4000-a000-00000000000a'$q$,
  $q$select bg_removals_used_monthly = 0 from public.user_credits where user_id = '00000000-0000-4000-a000-00000000000a'$q$);

delete from public.user_credits where user_id = '00000000-0000-4000-a000-00000000000e';
select pg_temp.probe('S4b credits', 'user inserts own credits row with 999 AI credits', 'deny', 'authenticated',
  '00000000-0000-4000-a000-00000000000e',
  $q$insert into public.user_credits (user_id, ai_studio_credits) values ('00000000-0000-4000-a000-00000000000e', 999)$q$,
  $q$select exists (select 1 from public.user_credits where user_id = '00000000-0000-4000-a000-00000000000e' and ai_studio_credits = 999)$q$);
delete from public.user_credits where user_id = '00000000-0000-4000-a000-00000000000e';
select pg_temp.probe('Flows', 'bg-remove: user creates own default credits row', 'ok', 'authenticated',
  '00000000-0000-4000-a000-00000000000e',
  $q$insert into public.user_credits (user_id) values ('00000000-0000-4000-a000-00000000000e')$q$,
  $q$select exists (select 1 from public.user_credits where user_id = '00000000-0000-4000-a000-00000000000e')$q$);
select pg_temp.probe('Flows', 'app reads own credits via get_user_credits', 'ok', 'authenticated',
  '00000000-0000-4000-a000-00000000000a',
  $q$select public.get_user_credits('00000000-0000-4000-a000-00000000000a')$q$);

-- ---------------------------------------------------------------------------
-- Wardrobe enhance credit (called with the user's login)
-- ---------------------------------------------------------------------------
select pg_temp.probe('Flows', 'wardrobe enhance: user deducts 1 own wardrobe credit', 'ok', 'authenticated',
  '00000000-0000-4000-a000-00000000000a',
  $q$select public.deduct_wardrobe_credit('00000000-0000-4000-a000-00000000000a', 1)$q$,
  $q$select wardrobe_credits = 19 from public.user_credits where user_id = '00000000-0000-4000-a000-00000000000a'$q$);
select pg_temp.probe('S4c wardrobe', 'user "deducts" -100 to add wardrobe credits', 'deny', 'authenticated',
  '00000000-0000-4000-a000-00000000000a',
  $q$select public.deduct_wardrobe_credit('00000000-0000-4000-a000-00000000000a', -100)$q$,
  $q$select wardrobe_credits > 19 from public.user_credits where user_id = '00000000-0000-4000-a000-00000000000a'$q$);
select pg_temp.probe('S4c wardrobe', 'user deducts another user''s wardrobe credit', 'deny', 'authenticated',
  '00000000-0000-4000-a000-00000000000a',
  $q$select public.deduct_wardrobe_credit('00000000-0000-4000-a000-00000000000b', 1)$q$,
  $q$select wardrobe_credits < 20 from public.user_credits where user_id = '00000000-0000-4000-a000-00000000000b'$q$);
select pg_temp.probe('S4c wardrobe', 'anon deducts a wardrobe credit', 'deny', 'anon', null,
  $q$select public.deduct_wardrobe_credit('00000000-0000-4000-a000-00000000000b', 1)$q$,
  $q$select wardrobe_credits < 20 from public.user_credits where user_id = '00000000-0000-4000-a000-00000000000b'$q$);
select pg_temp.probe('Flows', 'service role deducts a wardrobe credit', 'ok', 'service_role', null,
  $q$select public.deduct_wardrobe_credit('00000000-0000-4000-a000-00000000000b', 1)$q$,
  $q$select wardrobe_credits = 19 from public.user_credits where user_id = '00000000-0000-4000-a000-00000000000b'$q$);

-- ---------------------------------------------------------------------------
-- S3 (after signup). Changing metadata must not change the role.
-- Simulates supabase.auth.updateUser({ data: { role: 'admin' } }).
-- ---------------------------------------------------------------------------
update auth.users set raw_user_meta_data = raw_user_meta_data || '{"role":"admin"}'
  where id = '00000000-0000-4000-a000-00000000000c';
select pg_temp.check_fact('S3 metadata', 'metadata role=admin after signup does not change users.role',
  (select role::text from public.users where id = '00000000-0000-4000-a000-00000000000c') = 'shopper');

-- ---------------------------------------------------------------------------
-- Account deletion (delete-account edge function: service role, then Auth
-- admin deleteUser, simulated here by deleting the auth row)
-- ---------------------------------------------------------------------------
select pg_temp.probe('Flows', 'account deletion: service role deletes a user''s data', 'ok', 'service_role', null,
  $q$select public.delete_user_completely('00000000-0000-4000-a000-00000000000e'::uuid)$q$,
  $q$select not exists (select 1 from public.users where id = '00000000-0000-4000-a000-00000000000e')$q$);

-- ---------------------------------------------------------------------------
-- Clean up and report
-- ---------------------------------------------------------------------------
select pg_temp.cleanup();

select area, probe, expect, outcome, pass from probe_results order by seq;
