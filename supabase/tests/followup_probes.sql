-- Probes for the security follow-ups migration:
--   S15: get_user_credits only for your own account (server may read any)
--   admin_set_partner_verification: only admins approve/reject partners
--
-- On a branch, run as-is. On PRODUCTION, never run as-is: send the whole file
-- as ONE call (one transaction) and replace the final SELECT with a DO block
-- that RAISEs the results, so everything rolls back.

drop table if exists pg_temp.probe_results;
create temp table probe_results (seq serial primary key, area text, probe text, expect text, outcome text, pass boolean);

create or replace function pg_temp.probe(area text, probe text, expect text, as_role text, uid uuid, sql text, effect_sql text default null)
returns void language plpgsql as $$
declare raised text := null; effect boolean := null; outcome text; ok boolean;
begin
  begin
    perform set_config('request.jwt.claims', case when uid is null then json_build_object('role', as_role)::text else json_build_object('sub', uid, 'role', as_role)::text end, true);
    execute format('set local role %I', as_role);
    execute sql;
    reset role;
  exception when others then raised := sqlstate || ' ' || left(sqlerrm, 80);
  end;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  if raised is null and effect_sql is not null then
    begin execute effect_sql into effect; exception when others then effect := null; end;
    effect := coalesce(effect, false);
  end if;
  outcome := case when raised is not null then 'error: ' || raised when effect is false then 'no effect' else 'worked' end;
  ok := case when expect = 'deny' then raised is not null or effect is false else raised is null and coalesce(effect, true) end;
  insert into probe_results(area, probe, expect, outcome, pass) values (area, probe, expect, outcome, ok);
end; $$;

create or replace function pg_temp.check_fact(area text, probe text, fact boolean) returns void language sql as $$
  insert into probe_results(area, probe, expect, outcome, pass) values (area, probe, 'ok', case when fact then 'true' else 'false' end, coalesce(fact, false)); $$;

-- S shopper, V victim, A admin, B brand (owns a pending brand)
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000401', 'authenticated', 'authenticated', 's4@probe.example.test', '', '{"provider":"email"}', '{"role":"shopper"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000402', 'authenticated', 'authenticated', 'v4@probe.example.test', '', '{"provider":"email"}', '{"role":"shopper"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000403', 'authenticated', 'authenticated', 'a4@probe.example.test', '', '{"provider":"email"}', '{"role":"shopper"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000404', 'authenticated', 'authenticated', 'b4@probe.example.test', '', '{"provider":"email"}', '{"role":"brand"}', now(), now());
insert into public.user_roles (user_id, role) values ('00000000-0000-4000-a000-000000000403', 'admin');
insert into public.brands (id, name, slug, owner_user_id) values
  ('a0000000-0000-4000-b000-000000000401', 'Probe Pending', 'probe-pending-401', '00000000-0000-4000-a000-000000000404');
delete from public.user_credits where user_id = '00000000-0000-4000-a000-000000000402';

-- ---------------------------------------------------------------------------
-- S15: credits
-- ---------------------------------------------------------------------------
select pg_temp.probe('Credits', 'shopper reads their own credits', 'ok', 'authenticated', '00000000-0000-4000-a000-000000000401',
  $q$select * from public.get_user_credits('00000000-0000-4000-a000-000000000401')$q$);
select pg_temp.probe('Credits', 'shopper reads (and creates) another user''s credits', 'deny', 'authenticated', '00000000-0000-4000-a000-000000000401',
  $q$select * from public.get_user_credits('00000000-0000-4000-a000-000000000402')$q$,
  $q$select exists (select 1 from public.user_credits where user_id = '00000000-0000-4000-a000-000000000402')$q$);
select pg_temp.probe('Credits', 'logged-out visitor reads anyone''s credits', 'deny', 'anon', null,
  $q$select * from public.get_user_credits('00000000-0000-4000-a000-000000000402')$q$,
  $q$select exists (select 1 from public.user_credits where user_id = '00000000-0000-4000-a000-000000000402')$q$);
select pg_temp.probe('Credits', 'server (service role) reads any user''s credits', 'ok', 'service_role', null,
  $q$select * from public.get_user_credits('00000000-0000-4000-a000-000000000402')$q$,
  $q$select exists (select 1 from public.user_credits where user_id = '00000000-0000-4000-a000-000000000402')$q$);

-- ---------------------------------------------------------------------------
-- Partner approval
-- ---------------------------------------------------------------------------
select pg_temp.check_fact('Approval', 'admin_set_partner_verification exists',
  to_regprocedure('public.admin_set_partner_verification(text,uuid,text)') is not null);
select pg_temp.probe('Approval', 'shopper approves a brand', 'deny', 'authenticated', '00000000-0000-4000-a000-000000000401',
  $q$select public.admin_set_partner_verification('brand', 'a0000000-0000-4000-b000-000000000401', 'approved')$q$,
  $q$select verification_status = 'approved' from public.brands where id = 'a0000000-0000-4000-b000-000000000401'$q$);
select pg_temp.probe('Approval', 'brand approves itself', 'deny', 'authenticated', '00000000-0000-4000-a000-000000000404',
  $q$select public.admin_set_partner_verification('brand', 'a0000000-0000-4000-b000-000000000401', 'approved')$q$,
  $q$select verification_status = 'approved' from public.brands where id = 'a0000000-0000-4000-b000-000000000401'$q$);
select pg_temp.probe('Approval', 'logged-out visitor approves a brand', 'deny', 'anon', null,
  $q$select public.admin_set_partner_verification('brand', 'a0000000-0000-4000-b000-000000000401', 'approved')$q$,
  $q$select verification_status = 'approved' from public.brands where id = 'a0000000-0000-4000-b000-000000000401'$q$);
select pg_temp.probe('Approval', 'admin approves a pending brand', 'ok', 'authenticated', '00000000-0000-4000-a000-000000000403',
  $q$select public.admin_set_partner_verification('brand', 'a0000000-0000-4000-b000-000000000401', 'approved')$q$,
  $q$select verification_status = 'approved' and verification_updated_at is not null from public.brands where id = 'a0000000-0000-4000-b000-000000000401'$q$);
select pg_temp.probe('Approval', 'admin sets an unknown status', 'deny', 'authenticated', '00000000-0000-4000-a000-000000000403',
  $q$select public.admin_set_partner_verification('brand', 'a0000000-0000-4000-b000-000000000401', 'super')$q$,
  $q$select verification_status = 'super' from public.brands where id = 'a0000000-0000-4000-b000-000000000401'$q$);
select pg_temp.probe('Approval', 'admin rejects the brand', 'ok', 'authenticated', '00000000-0000-4000-a000-000000000403',
  $q$select public.admin_set_partner_verification('brand', 'a0000000-0000-4000-b000-000000000401', 'rejected')$q$,
  $q$select verification_status = 'rejected' from public.brands where id = 'a0000000-0000-4000-b000-000000000401'$q$);
select pg_temp.probe('Approval', 'admin approves a brand that does not exist', 'deny', 'authenticated', '00000000-0000-4000-a000-000000000403',
  $q$select public.admin_set_partner_verification('brand', '00000000-0000-0000-0000-00000000dead', 'approved')$q$);

select area, probe, expect, outcome, pass from probe_results order by seq;
