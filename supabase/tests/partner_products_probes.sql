-- Probes for the partner verification and product access migration.
--
-- Creates test accounts (emails end in @probe.example.test), brands,
-- a retailer and products, then checks who can see and write what.
-- On a branch, run as-is. On PRODUCTION, never run as-is: send the whole file
-- as ONE call (one transaction) and replace the final SELECT with a DO block
-- that RAISEs the results, so everything rolls back.
-- Written to run both BEFORE the migration (attack probes should fail) and
-- AFTER it (everything should pass).

drop table if exists pg_temp.probe_results;
create temp table probe_results (seq serial primary key, area text, probe text, expect text, outcome text, pass boolean);

-- probe(): run `sql` as `as_role` with PostgREST-style JWT claims. `effect_sql`
-- (optional, run as owner) returns true if the action took effect.
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
    execute effect_sql into effect;
    effect := coalesce(effect, false);  -- an empty (NULL) check means "no effect seen"
  end if;
  outcome := case when raised is not null then 'error: ' || raised when effect is false then 'no effect' else 'worked' end;
  ok := case when expect = 'deny' then raised is not null or effect is false else raised is null and coalesce(effect, true) end;
  insert into probe_results(area, probe, expect, outcome, pass) values (area, probe, expect, outcome, ok);
end; $$;

create or replace function pg_temp.check_fact(area text, probe text, fact boolean) returns void language sql as $$
  insert into probe_results(area, probe, expect, outcome, pass) values (area, probe, 'ok', case when fact then 'true' else 'false' end, coalesce(fact, false)); $$;

-- as_role_bool(): evaluate a boolean query as an API role (for "can they see it").
create or replace function pg_temp.as_role_bool(as_role text, uid uuid, sql text) returns boolean language plpgsql as $$
declare r boolean;
begin
  perform set_config('request.jwt.claims', case when uid is null then json_build_object('role', as_role)::text else json_build_object('sub', uid, 'role', as_role)::text end, true);
  execute format('set local role %I', as_role);
  execute sql into r;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  return r;
end; $$;

-- Accounts: S shopper, B brand, B2 brand (owns a claimed brand), R retailer (owns a store), R2 retailer (no store yet)
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000101', 'authenticated', 'authenticated', 's@probe.example.test', '', '{"provider":"email"}', '{"role":"shopper","name":"Probe S"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000102', 'authenticated', 'authenticated', 'b@probe.example.test', '', '{"provider":"email"}', '{"role":"brand","name":"Probe B"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000103', 'authenticated', 'authenticated', 'r@probe.example.test', '', '{"provider":"email"}', '{"role":"retailer","name":"Probe R"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000104', 'authenticated', 'authenticated', 'b2@probe.example.test', '', '{"provider":"email"}', '{"role":"brand","name":"Probe B2"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000105', 'authenticated', 'authenticated', 'r2@probe.example.test', '', '{"provider":"email"}', '{"role":"retailer","name":"Probe R2"}', now(), now());

-- Brands: BB (B, approved), BP (B, pending), B2B (B2, claimed), CAT (no owner, catalog), RH (R's house label)
insert into public.brands (id, name, slug, owner_user_id) values
  ('a0000000-0000-4000-b000-000000000001', 'Probe BB', 'probe-bb', '00000000-0000-4000-a000-000000000102'),
  ('a0000000-0000-4000-b000-000000000005', 'Probe BP', 'probe-bp', '00000000-0000-4000-a000-000000000102'),
  ('a0000000-0000-4000-b000-000000000002', 'Probe B2B', 'probe-b2b', '00000000-0000-4000-a000-000000000104'),
  ('a0000000-0000-4000-b000-000000000003', 'Probe CAT', 'probe-cat', null),
  ('a0000000-0000-4000-b000-000000000004', 'Probe RH', 'probe-rh', '00000000-0000-4000-a000-000000000103');
insert into public.retailers (id, name, slug, owner_user_id) values
  ('c0000000-0000-4000-b000-000000000001', 'Probe RR', 'probe-rr', '00000000-0000-4000-a000-000000000103');

-- After the migration, new partners default to pending: approve all probe partners except BP.
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='brands' and column_name='verification_status') then
    execute $q$update public.brands set verification_status = 'approved' where id in ('a0000000-0000-4000-b000-000000000001','a0000000-0000-4000-b000-000000000002','a0000000-0000-4000-b000-000000000003','a0000000-0000-4000-b000-000000000004')$q$;
    execute $q$update public.retailers set verification_status = 'approved' where id = 'c0000000-0000-4000-b000-000000000001'$q$;
  end if;
end $$;

-- Products: active and archived for BB, active for pending BP
insert into public.products (id, brand_id, sku, title, price_cents, currency, category_slug, status, media_urls) values
  ('d0000000-0000-4000-b000-000000000001', 'a0000000-0000-4000-b000-000000000001', 'probe-active', 'Probe active', 1000, 'AED', 'clothing', 'active', '[]'),
  ('d0000000-0000-4000-b000-000000000002', 'a0000000-0000-4000-b000-000000000001', 'probe-archived', 'Probe archived', 1000, 'AED', 'clothing', 'archived', '[]'),
  ('d0000000-0000-4000-b000-000000000003', 'a0000000-0000-4000-b000-000000000005', 'probe-pending', 'Probe pending brand', 1000, 'AED', 'clothing', 'active', '[]');

-- ---------------------------------------------------------------------------
-- Visibility
-- ---------------------------------------------------------------------------
select pg_temp.check_fact('Setup', 'brands.verification_status column exists',
  exists (select 1 from information_schema.columns where table_schema='public' and table_name='brands' and column_name='verification_status'));
select pg_temp.check_fact('Visibility', 'logged-out visitor sees an active product of an approved brand',
  pg_temp.as_role_bool('anon', null, $q$select exists (select 1 from public.products where id = 'd0000000-0000-4000-b000-000000000001')$q$));
select pg_temp.check_fact('Visibility', 'shopper sees an active product of an approved brand',
  pg_temp.as_role_bool('authenticated', '00000000-0000-4000-a000-000000000101', $q$select exists (select 1 from public.products where id = 'd0000000-0000-4000-b000-000000000001')$q$));
select pg_temp.check_fact('Visibility', 'logged-out visitor does NOT see an archived product',
  not pg_temp.as_role_bool('anon', null, $q$select exists (select 1 from public.products where id = 'd0000000-0000-4000-b000-000000000002')$q$));
select pg_temp.check_fact('Visibility', 'shopper does NOT see an archived product',
  not pg_temp.as_role_bool('authenticated', '00000000-0000-4000-a000-000000000101', $q$select exists (select 1 from public.products where id = 'd0000000-0000-4000-b000-000000000002')$q$));
select pg_temp.check_fact('Visibility', 'shopper does NOT see a product of a pending brand',
  not pg_temp.as_role_bool('authenticated', '00000000-0000-4000-a000-000000000101', $q$select exists (select 1 from public.products where id = 'd0000000-0000-4000-b000-000000000003')$q$));
select pg_temp.check_fact('Visibility', 'logged-out visitor does NOT see a product of a pending brand',
  not pg_temp.as_role_bool('anon', null, $q$select exists (select 1 from public.products where id = 'd0000000-0000-4000-b000-000000000003')$q$));
select pg_temp.check_fact('Visibility', 'brand owner still sees its own archived product',
  pg_temp.as_role_bool('authenticated', '00000000-0000-4000-a000-000000000102', $q$select exists (select 1 from public.products where id = 'd0000000-0000-4000-b000-000000000002')$q$));
select pg_temp.check_fact('Visibility', 'brand owner still sees its own product while pending',
  pg_temp.as_role_bool('authenticated', '00000000-0000-4000-a000-000000000102', $q$select exists (select 1 from public.products where id = 'd0000000-0000-4000-b000-000000000003')$q$));
do $$ declare expected int; begin
  select count(*) into expected from public.products where status = 'active' and not coalesce(is_event_only, false) and sku not like 'probe-%';
  perform pg_temp.check_fact('Visibility', 'existing catalog: logged-out visitors see exactly the ' || expected || ' active non-event products',
    pg_temp.as_role_bool('anon', null, format($q$select count(*) = %s from public.products where sku not like 'probe-%%'$q$, expected)));
end $$;

-- ---------------------------------------------------------------------------
-- Who can create brand and retailer profiles
-- ---------------------------------------------------------------------------
select pg_temp.probe('Profiles', 'shopper creates a brand profile', 'deny', 'authenticated', '00000000-0000-4000-a000-000000000101',
  $q$insert into public.brands (name, slug, owner_user_id) values ('Probe S brand', 'probe-s-brand', '00000000-0000-4000-a000-000000000101')$q$,
  $q$select exists (select 1 from public.brands where slug = 'probe-s-brand')$q$);
select pg_temp.probe('Profiles', 'brand account creates a brand profile', 'ok', 'authenticated', '00000000-0000-4000-a000-000000000102',
  $q$insert into public.brands (name, slug, owner_user_id) values ('Probe B new', 'probe-b-new', '00000000-0000-4000-a000-000000000102')$q$,
  $q$select exists (select 1 from public.brands where slug = 'probe-b-new')$q$);
select pg_temp.check_fact('Profiles', 'a newly created brand starts as pending',
  coalesce((select to_jsonb(b)->>'verification_status' from public.brands b where slug = 'probe-b-new'), 'missing') = 'pending');
select pg_temp.probe('Profiles', 'retailer account creates a house-label brand', 'ok', 'authenticated', '00000000-0000-4000-a000-000000000103',
  $q$insert into public.brands (name, slug, owner_user_id) values ('Probe R label', 'probe-r-label', '00000000-0000-4000-a000-000000000103')$q$,
  $q$select exists (select 1 from public.brands where slug = 'probe-r-label')$q$);
select pg_temp.probe('Profiles', 'shopper creates a retailer profile', 'deny', 'authenticated', '00000000-0000-4000-a000-000000000101',
  $q$insert into public.retailers (name, slug, owner_user_id) values ('Probe S store', 'probe-s-store', '00000000-0000-4000-a000-000000000101')$q$,
  $q$select exists (select 1 from public.retailers where slug = 'probe-s-store')$q$);
select pg_temp.probe('Profiles', 'brand account creates a retailer profile', 'deny', 'authenticated', '00000000-0000-4000-a000-000000000102',
  $q$insert into public.retailers (name, slug, owner_user_id) values ('Probe B store', 'probe-b-store', '00000000-0000-4000-a000-000000000102')$q$,
  $q$select exists (select 1 from public.retailers where slug = 'probe-b-store')$q$);
select pg_temp.probe('Profiles', 'retailer account creates its retailer profile', 'ok', 'authenticated', '00000000-0000-4000-a000-000000000105',
  $q$insert into public.retailers (name, slug, owner_user_id) values ('Probe R2 store', 'probe-r2-store', '00000000-0000-4000-a000-000000000105')$q$,
  $q$select exists (select 1 from public.retailers where slug = 'probe-r2-store')$q$);
select pg_temp.probe('Profiles', 'brand approves itself (verification_status = approved)', 'deny', 'authenticated', '00000000-0000-4000-a000-000000000102',
  $q$update public.brands set verification_status = 'approved' where id = 'a0000000-0000-4000-b000-000000000005'$q$,
  $q$select to_jsonb(b)->>'verification_status' = 'approved' from public.brands b where id = 'a0000000-0000-4000-b000-000000000005'$q$);
select pg_temp.probe('Profiles', 'brand inserts itself as already approved', 'deny', 'authenticated', '00000000-0000-4000-a000-000000000102',
  $q$insert into public.brands (name, slug, owner_user_id, verification_status) values ('Probe B pre', 'probe-b-pre', '00000000-0000-4000-a000-000000000102', 'approved')$q$,
  $q$select exists (select 1 from public.brands where slug = 'probe-b-pre')$q$);
select pg_temp.probe('Profiles', 'brand edits its own bio', 'ok', 'authenticated', '00000000-0000-4000-a000-000000000102',
  $q$update public.brands set bio = 'probe bio' where id = 'a0000000-0000-4000-b000-000000000001'$q$,
  $q$select bio = 'probe bio' from public.brands where id = 'a0000000-0000-4000-b000-000000000001'$q$);
select pg_temp.probe('Profiles', 'brand edits another brand''s bio', 'deny', 'authenticated', '00000000-0000-4000-a000-000000000102',
  $q$update public.brands set bio = 'hijacked' where id = 'a0000000-0000-4000-b000-000000000002'$q$,
  $q$select bio = 'hijacked' from public.brands where id = 'a0000000-0000-4000-b000-000000000002'$q$);

-- ---------------------------------------------------------------------------
-- Who can write products
-- ---------------------------------------------------------------------------
select pg_temp.probe('Products', 'brand adds a product to its own brand', 'ok', 'authenticated', '00000000-0000-4000-a000-000000000102',
  $q$insert into public.products (brand_id, sku, title, price_cents, currency, category_slug, status, media_urls) values ('a0000000-0000-4000-b000-000000000001', 'probe-b-own', 'x', 100, 'AED', 'clothing', 'draft', '[]')$q$,
  $q$select exists (select 1 from public.products where sku = 'probe-b-own')$q$);
select pg_temp.probe('Products', 'brand attaches its product to someone else''s store', 'deny', 'authenticated', '00000000-0000-4000-a000-000000000102',
  $q$insert into public.products (brand_id, retailer_id, sku, title, price_cents, currency, category_slug, status, media_urls) values ('a0000000-0000-4000-b000-000000000001', 'c0000000-0000-4000-b000-000000000001', 'probe-b-store', 'x', 100, 'AED', 'clothing', 'draft', '[]')$q$,
  $q$select exists (select 1 from public.products where sku = 'probe-b-store')$q$);
select pg_temp.probe('Products', 'retailer imports a product for a catalog brand with no owner', 'ok', 'authenticated', '00000000-0000-4000-a000-000000000103',
  $q$insert into public.products (brand_id, retailer_id, sku, title, price_cents, currency, category_slug, status, media_urls) values ('a0000000-0000-4000-b000-000000000003', 'c0000000-0000-4000-b000-000000000001', 'probe-r-cat', 'x', 100, 'AED', 'clothing', 'draft', '[]')$q$,
  $q$select exists (select 1 from public.products where sku = 'probe-r-cat')$q$);
select pg_temp.probe('Products', 'retailer adds a product to its own house label', 'ok', 'authenticated', '00000000-0000-4000-a000-000000000103',
  $q$insert into public.products (brand_id, retailer_id, sku, title, price_cents, currency, category_slug, status, media_urls) values ('a0000000-0000-4000-b000-000000000004', 'c0000000-0000-4000-b000-000000000001', 'probe-r-house', 'x', 100, 'AED', 'clothing', 'draft', '[]')$q$,
  $q$select exists (select 1 from public.products where sku = 'probe-r-house')$q$);
select pg_temp.probe('Products', 'retailer posts under another company''s claimed brand', 'deny', 'authenticated', '00000000-0000-4000-a000-000000000103',
  $q$insert into public.products (brand_id, retailer_id, sku, title, price_cents, currency, category_slug, status, media_urls) values ('a0000000-0000-4000-b000-000000000002', 'c0000000-0000-4000-b000-000000000001', 'probe-r-claimed', 'x', 100, 'AED', 'clothing', 'active', '[]')$q$,
  $q$select exists (select 1 from public.products where sku = 'probe-r-claimed')$q$);
select pg_temp.probe('Products', 'retailer moves its own product onto a claimed brand', 'deny', 'authenticated', '00000000-0000-4000-a000-000000000103',
  $q$update public.products set brand_id = 'a0000000-0000-4000-b000-000000000002' where sku = 'probe-r-cat'$q$,
  $q$select brand_id = 'a0000000-0000-4000-b000-000000000002' from public.products where sku = 'probe-r-cat'$q$);
select pg_temp.probe('Products', 'shopper adds a product to a brand they don''t own', 'deny', 'authenticated', '00000000-0000-4000-a000-000000000101',
  $q$insert into public.products (brand_id, sku, title, price_cents, currency, category_slug, status, media_urls) values ('a0000000-0000-4000-b000-000000000001', 'probe-s-prod', 'x', 100, 'AED', 'clothing', 'active', '[]')$q$,
  $q$select exists (select 1 from public.products where sku = 'probe-s-prod')$q$);
select pg_temp.probe('Products', 'brand archives its own product', 'ok', 'authenticated', '00000000-0000-4000-a000-000000000102',
  $q$update public.products set status = 'archived' where id = 'd0000000-0000-4000-b000-000000000001'$q$,
  $q$select status = 'archived' from public.products where id = 'd0000000-0000-4000-b000-000000000001'$q$);
select pg_temp.probe('Products', 'brand edits another brand''s product', 'deny', 'authenticated', '00000000-0000-4000-a000-000000000104',
  $q$update public.products set title = 'hijacked' where id = 'd0000000-0000-4000-b000-000000000002'$q$,
  $q$select title = 'hijacked' from public.products where id = 'd0000000-0000-4000-b000-000000000002'$q$);

select area, probe, expect, outcome, pass from probe_results order by seq;
