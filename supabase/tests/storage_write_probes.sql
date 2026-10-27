-- Probes for 20261027125651_storage_close_open_writes.sql (who can write to
-- photo folders; owner read rules).
--
-- On a branch, run as-is. On PRODUCTION, never run as-is: send the whole file
-- as ONE call (one transaction) and replace the final SELECT with a DO block
-- that RAISEs the results, so everything rolls back.
-- Storage blocks direct SQL deletes (storage.protect_delete), so delete rules
-- are checked by their definition, not by deleting.

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
    execute effect_sql into effect;
    effect := coalesce(effect, false);
  end if;
  outcome := case when raised is not null then 'error: ' || raised when effect is false then 'no effect' else 'worked' end;
  ok := case when expect = 'deny' then raised is not null or effect is false else raised is null and coalesce(effect, true) end;
  insert into probe_results(area, probe, expect, outcome, pass) values (area, probe, expect, outcome, ok);
end; $$;

create or replace function pg_temp.check_fact(area text, probe text, fact boolean) returns void language sql as $$
  insert into probe_results(area, probe, expect, outcome, pass) values (area, probe, 'ok', case when fact then 'true' else 'false' end, coalesce(fact, false)); $$;

-- No-one but the server may write to a bucket: true when no INSERT/UPDATE/DELETE/ALL rule mentions it.
create or replace function pg_temp.no_write_rules(b text) returns boolean language sql as $$
  select not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
    and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
    and (coalesce(qual, '') || coalesce(with_check, '')) like '%''' || b || '''%'); $$;

-- O owns the photos; X is another shopper.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000601', 'authenticated', 'authenticated', 'o6@probe.example.test', '', '{"provider":"email"}', '{"role":"shopper"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000602', 'authenticated', 'authenticated', 'x6@probe.example.test', '', '{"provider":"email"}', '{"role":"shopper"}', now(), now());

-- Two brands with owners and a product each, plus a store-owned product (real rows, nothing changed).
create temp table probe_ctx as
with owned as (
  select b.owner_user_id as owner, (select p.id from public.products p where p.brand_id = b.id order by p.id limit 1) as product_id
  from public.brands b where b.owner_user_id is not null and exists (select 1 from public.products p where p.brand_id = b.id)
  order by b.id limit 2)
select (select owner from owned order by owner limit 1) as b1, (select product_id from owned order by owner limit 1) as p1,
       (select owner from owned order by owner offset 1 limit 1) as b2, (select product_id from owned order by owner offset 1 limit 1) as p2,
       (select r.owner_user_id from public.products p join public.retailers r on r.id = p.retailer_id where r.owner_user_id is not null order by p.id limit 1) as r1,
       (select p.id from public.products p join public.retailers r on r.id = p.retailer_id where r.owner_user_id is not null order by p.id limit 1) as rp,
       (select o.name from storage.objects o where o.bucket_id = 'optimized-images' order by o.name limit 1) as cached;

do $$ declare c record; begin
  select * into c from probe_ctx;
  insert into storage.objects (bucket_id, name, owner) values
    ('ai-tryon-results', '00000000-0000-4000-a000-000000000601/probe_result.png', '00000000-0000-4000-a000-000000000601'),
    ('ai-tryon-videos', '00000000-0000-4000-a000-000000000601/probe_video.mp4', '00000000-0000-4000-a000-000000000601'),
    ('tnb-video-inputs', '00000000-0000-4000-a000-000000000601/probe_input.jpg', '00000000-0000-4000-a000-000000000601'),
    ('ai-tryon-uploads', '00000000-0000-4000-a000-000000000601/probe_person.jpg', '00000000-0000-4000-a000-000000000601'),
    ('product-outfits', c.p1 || '-probe.jpg', c.b1);
end $$;

-- ---------------------------------------------------------------------------
-- Try-on results and videos: only the server writes
-- ---------------------------------------------------------------------------
select pg_temp.probe('Results', 'logged-out visitor can not upload a try-on result', 'deny', 'anon', null,
  $q$insert into storage.objects (bucket_id, name) values ('ai-tryon-results', 'anon-probe/x.png')$q$);
select pg_temp.probe('Results', 'another user can not upload into someone''s result folder', 'deny', 'authenticated', '00000000-0000-4000-a000-000000000602',
  $q$insert into storage.objects (bucket_id, name) values ('ai-tryon-results', '00000000-0000-4000-a000-000000000601/x.png')$q$);
select pg_temp.probe('Results', 'another user can not overwrite someone''s try-on result', 'deny', 'authenticated', '00000000-0000-4000-a000-000000000602',
  $q$update storage.objects set metadata = '{"probe": 1}' where bucket_id = 'ai-tryon-results' and name = '00000000-0000-4000-a000-000000000601/probe_result.png'$q$,
  $q$select metadata->>'probe' = '1' from storage.objects where bucket_id = 'ai-tryon-results' and name = '00000000-0000-4000-a000-000000000601/probe_result.png'$q$);
select pg_temp.probe('Results', 'logged-out visitor can not overwrite a try-on result', 'deny', 'anon', null,
  $q$update storage.objects set metadata = '{"probe": 2}' where bucket_id = 'ai-tryon-results' and name = '00000000-0000-4000-a000-000000000601/probe_result.png'$q$,
  $q$select metadata->>'probe' = '2' from storage.objects where bucket_id = 'ai-tryon-results' and name = '00000000-0000-4000-a000-000000000601/probe_result.png'$q$);
select pg_temp.probe('Videos', 'logged-out visitor can not upload a video', 'deny', 'anon', null,
  $q$insert into storage.objects (bucket_id, name) values ('ai-tryon-videos', 'anon-probe/x.mp4')$q$);
select pg_temp.probe('Videos', 'another user can not overwrite someone''s video', 'deny', 'authenticated', '00000000-0000-4000-a000-000000000602',
  $q$update storage.objects set metadata = '{"probe": 3}' where bucket_id = 'ai-tryon-videos' and name = '00000000-0000-4000-a000-000000000601/probe_video.mp4'$q$,
  $q$select metadata->>'probe' = '3' from storage.objects where bucket_id = 'ai-tryon-videos' and name = '00000000-0000-4000-a000-000000000601/probe_video.mp4'$q$);
select pg_temp.probe('Video inputs', 'logged-out visitor can not upload a video input', 'deny', 'anon', null,
  $q$insert into storage.objects (bucket_id, name) values ('tnb-video-inputs', 'anon-probe/x.jpg')$q$);
select pg_temp.check_fact('Writes', 'no user rule can write or delete in ' || b, pg_temp.no_write_rules(b))
from unnest(array['ai-tryon-results', 'ai-tryon-videos', 'tnb-video-inputs', 'optimized-images']) b;

-- ---------------------------------------------------------------------------
-- Image cache
-- ---------------------------------------------------------------------------
select pg_temp.probe('Image cache', 'logged-out visitor can not add to the image cache', 'deny', 'anon', null,
  $q$insert into storage.objects (bucket_id, name) values ('optimized-images', 'anon-probe.jpg')$q$);
do $$ declare c record; begin
  select * into c from probe_ctx;
  if c.cached is not null then
    perform pg_temp.probe('Image cache', 'logged-out visitor can not overwrite a cached image', 'deny', 'anon', null,
      format($q$update storage.objects set metadata = '{"probe": 4}' where bucket_id = 'optimized-images' and name = %L$q$, c.cached),
      format($q$select metadata->>'probe' = '4' from storage.objects where bucket_id = 'optimized-images' and name = %L$q$, c.cached));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- AI Studio uploads
-- ---------------------------------------------------------------------------
select pg_temp.probe('Uploads', 'another user can not upload into someone''s AI Studio folder', 'deny', 'authenticated', '00000000-0000-4000-a000-000000000602',
  $q$insert into storage.objects (bucket_id, name) values ('ai-tryon-uploads', '00000000-0000-4000-a000-000000000601/sneaky.jpg')$q$);
select pg_temp.probe('Uploads', 'logged-out visitor can not upload an AI Studio photo', 'deny', 'anon', null,
  $q$insert into storage.objects (bucket_id, name) values ('ai-tryon-uploads', 'anon-probe/x.jpg')$q$);
select pg_temp.probe('Uploads', 'owner can upload into their own AI Studio folder', 'allow', 'authenticated', '00000000-0000-4000-a000-000000000601',
  $q$insert into storage.objects (bucket_id, name) values ('ai-tryon-uploads', '00000000-0000-4000-a000-000000000601/person_2.jpg')$q$);
select pg_temp.probe('Uploads', 'owner can replace their own AI Studio photo (upsert update)', 'allow', 'authenticated', '00000000-0000-4000-a000-000000000601',
  $q$update storage.objects set metadata = '{"probe": 5}' where bucket_id = 'ai-tryon-uploads' and name = '00000000-0000-4000-a000-000000000601/probe_person.jpg'$q$,
  $q$select metadata->>'probe' = '5' from storage.objects where bucket_id = 'ai-tryon-uploads' and name = '00000000-0000-4000-a000-000000000601/probe_person.jpg'$q$);

-- ---------------------------------------------------------------------------
-- Brand outfit images
-- ---------------------------------------------------------------------------
do $$ declare c record; begin
  select * into c from probe_ctx;
  perform pg_temp.check_fact('Outfits', 'probe has two owned brands with products and a store product',
    c.b1 is not null and c.b2 is not null and c.p1 is not null and c.p2 is not null and c.r1 is not null and c.rp is not null);
  perform pg_temp.probe('Outfits', 'brand owner can upload an outfit image for their product', 'allow', 'authenticated', c.b1,
    format($q$insert into storage.objects (bucket_id, name) values ('product-outfits', %L)$q$, c.p1 || '-probe2.jpg'));
  perform pg_temp.probe('Outfits', 'another brand can not upload an outfit image for that product', 'deny', 'authenticated', c.b2,
    format($q$insert into storage.objects (bucket_id, name) values ('product-outfits', %L)$q$, c.p1 || '-probe3.jpg'));
  perform pg_temp.probe('Outfits', 'another brand can not overwrite that product''s outfit image', 'deny', 'authenticated', c.b2,
    format($q$update storage.objects set metadata = '{"probe": 6}' where bucket_id = 'product-outfits' and name = %L$q$, c.p1 || '-probe.jpg'),
    format($q$select metadata->>'probe' = '6' from storage.objects where bucket_id = 'product-outfits' and name = %L$q$, c.p1 || '-probe.jpg'));
  perform pg_temp.probe('Outfits', 'brand owner can replace their own outfit image', 'allow', 'authenticated', c.b1,
    format($q$update storage.objects set metadata = '{"probe": 7}' where bucket_id = 'product-outfits' and name = %L$q$, c.p1 || '-probe.jpg'),
    format($q$select metadata->>'probe' = '7' from storage.objects where bucket_id = 'product-outfits' and name = %L$q$, c.p1 || '-probe.jpg'));
  perform pg_temp.probe('Outfits', 'second brand can upload for its own product', 'allow', 'authenticated', c.b2,
    format($q$insert into storage.objects (bucket_id, name) values ('product-outfits', %L)$q$, c.p2 || '-probe.jpg'));
  perform pg_temp.probe('Outfits', 'store owner can upload for its own product', 'allow', 'authenticated', c.r1,
    format($q$insert into storage.objects (bucket_id, name) values ('product-outfits', %L)$q$, c.rp || '-probe.jpg'));
  perform pg_temp.probe('Outfits', 'a shopper can not upload brand outfit images', 'deny', 'authenticated', '00000000-0000-4000-a000-000000000602',
    format($q$insert into storage.objects (bucket_id, name) values ('product-outfits', %L)$q$, c.p1 || '-x.jpg'));
end $$;
select pg_temp.check_fact('Outfits', 'delete rule for outfit images checks the product owner',
  exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and cmd = 'DELETE'
          and qual like '%product-outfits%' and qual like '%owner_user_id%')
  and not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and cmd in ('DELETE', 'UPDATE', 'INSERT', 'ALL')
          and (coalesce(qual, '') || coalesce(with_check, '')) like '%product-outfits%'
          and (coalesce(qual, '') || coalesce(with_check, '')) not like '%owner_user_id%'));

-- ---------------------------------------------------------------------------
-- Server and owner read rules
-- ---------------------------------------------------------------------------
select pg_temp.probe('Server', 'the server key can still store a try-on result', 'allow', 'service_role', null,
  $q$insert into storage.objects (bucket_id, name) values ('ai-tryon-results', '00000000-0000-4000-a000-000000000601/server.png')$q$);
select pg_temp.check_fact('Read rules', 'owner-only read rule exists for ' || b,
  exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and cmd = 'SELECT'
          and roles::text = '{authenticated}' and qual like '%''' || b || '''%' and qual like '%foldername%' and qual like '%auth.uid()%'))
from unnest(array['ai-tryon-uploads', 'ai-tryon-results', 'ai-tryon-videos', 'tnb-video-inputs', 'search-images', 'saved-outfits']) b;

select area, probe, expect, outcome, pass from probe_results order by seq;
