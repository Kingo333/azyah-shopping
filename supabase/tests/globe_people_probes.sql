-- Probes for 20261027100000_globe_people_lookups.sql (Globe "People" tab).
-- On a branch, run as-is. On PRODUCTION, never run as-is: send the whole file
-- as ONE call (one transaction) and replace the final SELECT with a DO block
-- that RAISEs the results, so everything rolls back.

drop table if exists pg_temp.probe_results;
create temp table probe_results (seq serial primary key, area text, probe text, expect text, outcome text, pass boolean);

create or replace function pg_temp.check_fact(area text, probe text, fact boolean) returns void language sql as $$
  insert into probe_results(area, probe, expect, outcome, pass) values (area, probe, 'ok', case when fact then 'true' else 'false' end, coalesce(fact, false)); $$;

-- try_text(): run a text query as an API role; any error returns '<error>'.
create or replace function pg_temp.try_text(as_role text, uid uuid, sql text) returns text language plpgsql as $$
declare r text;
begin
  begin
    perform set_config('request.jwt.claims', case when uid is null then json_build_object('role', as_role)::text else json_build_object('sub', uid, 'role', as_role)::text end, true);
    execute format('set local role %I', as_role);
    execute sql into r;
    reset role;
  exception when others then r := '<error>';
  end;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  return r;
end; $$;

-- P1 visible shopper in France, P2 hidden shopper in France, P3 shopper with
-- no country, B brand in France, S viewer (shopper in the UAE)
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000501', 'authenticated', 'authenticated', 'p1@probe.example.test', '', '{"provider":"email"}', '{"role":"shopper","name":"Probe Visible"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000502', 'authenticated', 'authenticated', 'p2@probe.example.test', '', '{"provider":"email"}', '{"role":"shopper","name":"Probe Hidden"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000503', 'authenticated', 'authenticated', 'p3@probe.example.test', '', '{"provider":"email"}', '{"role":"shopper","name":"Probe Nowhere"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000504', 'authenticated', 'authenticated', 'b5@probe.example.test', '', '{"provider":"email"}', '{"role":"brand","name":"Probe Brand"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000505', 'authenticated', 'authenticated', 's5@probe.example.test', '', '{"provider":"email"}', '{"role":"shopper","name":"Probe Viewer"}', now(), now());
update public.users set country = 'France' where id in ('00000000-0000-4000-a000-000000000501', '00000000-0000-4000-a000-000000000502', '00000000-0000-4000-a000-000000000504');
update public.users set country = 'United Arab Emirates' where id = '00000000-0000-4000-a000-000000000505';
update public.users set preferences = coalesce(preferences, '{}'::jsonb) || '{"visible_on_globe": false}' where id = '00000000-0000-4000-a000-000000000502';

select pg_temp.check_fact('Counts', 'logged-out visitor gets the right count for France (visible shoppers only)',
  pg_temp.try_text('anon', null, $q$select people::text from public.get_globe_people_counts() where country = 'France'$q$)
  = (select count(*)::text from public.users where role = 'shopper' and country = 'France' and coalesce(preferences->>'visible_on_globe', 'true') <> 'false'));
select pg_temp.check_fact('Counts', 'a shopper sees counts that include other people, not just themselves',
  coalesce(pg_temp.try_text('authenticated', '00000000-0000-4000-a000-000000000505', $q$select coalesce(sum(people), 0)::text from public.get_globe_people_counts()$q$), '0')::int >= 3);
select pg_temp.check_fact('Counts', 'people without a country are counted (global pin)',
  coalesce(pg_temp.try_text('anon', null, $q$select people::text from public.get_globe_people_counts() where country is null$q$), '0')::int >= 1);

select pg_temp.check_fact('List', 'a shopper sees a visible person in France',
  pg_temp.try_text('authenticated', '00000000-0000-4000-a000-000000000505', $q$select exists (select 1 from public.get_globe_people('France') where id = '00000000-0000-4000-a000-000000000501')::text$q$) = 'true');
select pg_temp.check_fact('List', 'a person who hid themselves from the Globe is not listed',
  pg_temp.try_text('authenticated', '00000000-0000-4000-a000-000000000505', $q$select exists (select 1 from public.get_globe_people('France') where id = '00000000-0000-4000-a000-000000000502')::text$q$) = 'false');
select pg_temp.check_fact('List', 'brands are not listed as people',
  pg_temp.try_text('authenticated', '00000000-0000-4000-a000-000000000505', $q$select exists (select 1 from public.get_globe_people('France') where id = '00000000-0000-4000-a000-000000000504')::text$q$) = 'false');
select pg_temp.check_fact('List', 'the global pin lists people with no country',
  pg_temp.try_text('anon', null, $q$select exists (select 1 from public.get_globe_people(null) where id = '00000000-0000-4000-a000-000000000503')::text$q$) = 'true');
select pg_temp.check_fact('List', 'the list returns only public profile fields (no email)',
  coalesce((select pg_get_function_result(to_regprocedure('public.get_globe_people(text,integer)'))), '') = 'TABLE(id uuid, name text, username text, avatar_url text)');
select pg_temp.check_fact('List', 'a caller can not ask for more than 50 people at once',
  coalesce(pg_temp.try_text('anon', null, $q$select count(*)::text from public.get_globe_people(null, 100000)$q$), '<error>') <> '<error>'
  and pg_temp.try_text('anon', null, $q$select count(*)::text from public.get_globe_people(null, 100000)$q$)::int <= 50);

select area, probe, expect, outcome, pass from probe_results order by seq;
