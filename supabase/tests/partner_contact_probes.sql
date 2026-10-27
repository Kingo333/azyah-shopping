-- Probes for the private partner contact email migration.
--
-- On a branch, run as-is. On PRODUCTION, never run as-is: send the whole file
-- as ONE call (one transaction) and replace the final SELECT with a DO block
-- that RAISEs the results, so everything rolls back.
-- To check that existing emails survive the move, create
--   temp table probe_before (n int)
-- with the count of brands holding an email BEFORE running the migration.

create temp table if not exists probe_before as
  select count(*)::int as n from public.brands where nullif(trim(contact_email), '') is not null;

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
    begin
      execute effect_sql into effect;
    exception when others then effect := null;
    end;
    effect := coalesce(effect, false);
  end if;
  outcome := case when raised is not null then 'error: ' || raised when effect is false then 'no effect' else 'worked' end;
  ok := case when expect = 'deny' then raised is not null or effect is false else raised is null and coalesce(effect, true) end;
  insert into probe_results(area, probe, expect, outcome, pass) values (area, probe, expect, outcome, ok);
end; $$;

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

-- Accounts: S shopper, B brand (owns BB), R retailer (owns RR)
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000301', 'authenticated', 'authenticated', 's3@probe.example.test', '', '{"provider":"email"}', '{"role":"shopper"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000302', 'authenticated', 'authenticated', 'b3@probe.example.test', '', '{"provider":"email"}', '{"role":"brand"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000303', 'authenticated', 'authenticated', 'r3@probe.example.test', '', '{"provider":"email"}', '{"role":"retailer"}', now(), now());
insert into public.brands (id, name, slug, owner_user_id, contact_email) values
  ('a0000000-0000-4000-b000-000000000301', 'Probe Contact Brand', 'probe-contact-brand', '00000000-0000-4000-a000-000000000302', 'brand-secret@probe.example.test');
insert into public.retailers (id, name, slug, owner_user_id, contact_email) values
  ('c0000000-0000-4000-b000-000000000301', 'Probe Contact Store', 'probe-contact-store', '00000000-0000-4000-a000-000000000303', 'store-secret@probe.example.test');

-- ---------------------------------------------------------------------------
-- Nobody but the owner can read the email
-- ---------------------------------------------------------------------------
select pg_temp.check_fact('Brands', 'logged-out visitor sees no contact email on the brand',
  coalesce(pg_temp.try_text('anon', null, $q$select contact_email from public.brands where id = 'a0000000-0000-4000-b000-000000000301'$q$), '') not like '%secret%');
select pg_temp.check_fact('Brands', 'shopper sees no contact email on the brand',
  coalesce(pg_temp.try_text('authenticated', '00000000-0000-4000-a000-000000000301', $q$select contact_email from public.brands where id = 'a0000000-0000-4000-b000-000000000301'$q$), '') not like '%secret%');
select pg_temp.check_fact('Brands', 'shopper gets no email from get_brand_contact_info',
  coalesce(pg_temp.try_text('authenticated', '00000000-0000-4000-a000-000000000301', $q$select contact_email from public.get_brand_contact_info('a0000000-0000-4000-b000-000000000301')$q$), '') not like '%secret%');
select pg_temp.check_fact('Brands', 'shopper gets no email from get_brand_contact_secure',
  coalesce(pg_temp.try_text('authenticated', '00000000-0000-4000-a000-000000000301', $q$select contact_email from public.get_brand_contact_secure('a0000000-0000-4000-b000-000000000301')$q$), '') not like '%secret%');
select pg_temp.check_fact('Brands', 'shopper can not read the private contacts table',
  coalesce(pg_temp.try_text('authenticated', '00000000-0000-4000-a000-000000000301', $q$select string_agg(contact_email, ',') from public.brand_contacts$q$), '') not like '%secret%');
select pg_temp.check_fact('Brands', 'owner reads their own email from the private contacts table',
  pg_temp.try_text('authenticated', '00000000-0000-4000-a000-000000000302', $q$select contact_email from public.brand_contacts where brand_id = 'a0000000-0000-4000-b000-000000000301'$q$) = 'brand-secret@probe.example.test');
select pg_temp.check_fact('Brands', 'owner still gets their email from get_brand_contact_info',
  pg_temp.try_text('authenticated', '00000000-0000-4000-a000-000000000302', $q$select contact_email from public.get_brand_contact_info('a0000000-0000-4000-b000-000000000301')$q$) = 'brand-secret@probe.example.test');

select pg_temp.check_fact('Retailers', 'logged-out visitor sees no contact email on the store',
  coalesce(pg_temp.try_text('anon', null, $q$select contact_email from public.retailers where id = 'c0000000-0000-4000-b000-000000000301'$q$), '') not like '%secret%');
select pg_temp.check_fact('Retailers', 'shopper gets no email from get_retailer_contact_info',
  coalesce(pg_temp.try_text('authenticated', '00000000-0000-4000-a000-000000000301', $q$select contact_email from public.get_retailer_contact_info('c0000000-0000-4000-b000-000000000301')$q$), '') not like '%secret%');
select pg_temp.check_fact('Retailers', 'owner reads their own email from the private contacts table',
  pg_temp.try_text('authenticated', '00000000-0000-4000-a000-000000000303', $q$select contact_email from public.retailer_contacts where retailer_id = 'c0000000-0000-4000-b000-000000000301'$q$) = 'store-secret@probe.example.test');

-- ---------------------------------------------------------------------------
-- Owners can still change their email (new screens and the app that's live now)
-- ---------------------------------------------------------------------------
select pg_temp.probe('Edit', 'owner changes their email in the private table', 'ok', 'authenticated', '00000000-0000-4000-a000-000000000302',
  $q$update public.brand_contacts set contact_email = 'brand-new@probe.example.test' where brand_id = 'a0000000-0000-4000-b000-000000000301'$q$,
  $q$select contact_email = 'brand-new@probe.example.test' from public.brand_contacts where brand_id = 'a0000000-0000-4000-b000-000000000301'$q$);
select pg_temp.probe('Edit', 'live app saves the email on the brand: it moves to the private table', 'ok', 'authenticated', '00000000-0000-4000-a000-000000000302',
  $q$update public.brands set contact_email = 'brand-old-app@probe.example.test' where id = 'a0000000-0000-4000-b000-000000000301'$q$,
  $q$select (select contact_email from public.brand_contacts where brand_id = 'a0000000-0000-4000-b000-000000000301') = 'brand-old-app@probe.example.test'
        and (select contact_email from public.brands where id = 'a0000000-0000-4000-b000-000000000301') is null$q$);
select pg_temp.probe('Edit', 'live app saving an empty email does not wipe the stored one', 'ok', 'authenticated', '00000000-0000-4000-a000-000000000302',
  $q$update public.brands set contact_email = '' where id = 'a0000000-0000-4000-b000-000000000301'$q$,
  $q$select contact_email = 'brand-old-app@probe.example.test' from public.brand_contacts where brand_id = 'a0000000-0000-4000-b000-000000000301'$q$);
select pg_temp.probe('Edit', 'shopper changes a brand''s email', 'deny', 'authenticated', '00000000-0000-4000-a000-000000000301',
  $q$update public.brand_contacts set contact_email = 'hijack@probe.example.test' where brand_id = 'a0000000-0000-4000-b000-000000000301'$q$,
  $q$select contact_email = 'hijack@probe.example.test' from public.brand_contacts where brand_id = 'a0000000-0000-4000-b000-000000000301'$q$);
select pg_temp.probe('Edit', 'new brand profile created with an email keeps it private', 'ok', 'authenticated', '00000000-0000-4000-a000-000000000302',
  $q$insert into public.brands (id, name, slug, owner_user_id, contact_email) values ('a0000000-0000-4000-b000-000000000302', 'Probe New', 'probe-contact-new', '00000000-0000-4000-a000-000000000302', 'new-secret@probe.example.test')$q$,
  $q$select (select contact_email from public.brand_contacts where brand_id = 'a0000000-0000-4000-b000-000000000302') = 'new-secret@probe.example.test'
        and (select contact_email from public.brands where id = 'a0000000-0000-4000-b000-000000000302') is null$q$);

-- ---------------------------------------------------------------------------
-- Existing data
-- ---------------------------------------------------------------------------
select pg_temp.check_fact('Data', 'no brand or store row holds an email any more',
  not exists (select 1 from public.brands where nullif(trim(contact_email), '') is not null)
  and not exists (select 1 from public.retailers where nullif(trim(contact_email), '') is not null));
select pg_temp.check_fact('Data', 'every email that existed before is kept privately',
  coalesce(pg_temp.try_text('postgres', null, $q$select (count(*) >= (select n from probe_before))::text from public.brand_contacts where brand_id not in ('a0000000-0000-4000-b000-000000000301','a0000000-0000-4000-b000-000000000302')$q$), 'false') = 'true');

select area, probe, expect, outcome, pass from probe_results order by seq;
