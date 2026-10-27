-- Probes for 20261027172029_list_user_storage_objects.sql.
-- Simulates the moment delete-account calls the helper: the user's own rows
-- are already deleted (delete_user_completely ran first).
--
-- On a branch, run as-is. On PRODUCTION, never run as-is: send the whole file
-- as ONE call (one transaction) and replace the final SELECT with a DO block
-- that RAISEs the results, so everything rolls back.

drop table if exists pg_temp.probe_results;
create temp table probe_results (seq serial primary key, area text, probe text, expect text, outcome text, pass boolean);

create or replace function pg_temp.check_fact(area text, probe text, fact boolean) returns void language sql as $$
  insert into probe_results(area, probe, expect, outcome, pass) values (area, probe, 'ok', case when fact then 'true' else 'false' end, coalesce(fact, false)); $$;

-- How many times the helper lists a file for a user (-1 when the helper is missing).
create or replace function pg_temp.listed(uid uuid, b text, n text) returns int language plpgsql as $$
declare c int;
begin
  begin execute 'select count(*) from public.list_user_storage_objects($1) where bucket_id = $2 and name = $3' into c using uid, b, n;
  exception when others then c := -1; end;
  return c;
end; $$;
create or replace function pg_temp.listed_all(uid uuid) returns int language plpgsql as $$
declare c int;
begin
  begin execute 'select count(*) from public.list_user_storage_objects($1)' into c using uid;
  exception when others then c := -1; end;
  return c;
end; $$;

-- U is deleting their account; V is someone else who keeps theirs.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000901', 'authenticated', 'authenticated', 'u9@probe.example.test', '', '{"provider":"email"}', '{"role":"shopper"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000902', 'authenticated', 'authenticated', 'v9@probe.example.test', '', '{"provider":"email"}', '{"role":"shopper"}', now(), now());

insert into storage.objects (bucket_id, name, owner) values
  ('ai-tryon-uploads', '00000000-0000-4000-a000-000000000901/person.jpg', null),
  ('wardrobe-items', '00000000-0000-4000-a000-000000000901/shirt.png', '00000000-0000-4000-a000-000000000901'),
  ('live-cam-snapshots', '00000000-0000-4000-a000-000000000901/snap.jpg', null),
  ('event-user-photos', '11111111-1111-4111-8111-111111111111/00000000-0000-4000-a000-000000000901/person_1.jpeg', null),
  ('tryon', 'tryon/users/00000000-0000-4000-a000-000000000901/inputs/1.jpeg', null),
  ('product-images', 'misc/uploaded-by-u.jpg', '00000000-0000-4000-a000-000000000901'),
  ('wardrobe-items', '00000000-0000-4000-a000-000000000901/default-tee.png', '00000000-0000-4000-a000-000000000901'),
  ('wardrobe-items', '00000000-0000-4000-a000-000000000901/starter.png', '00000000-0000-4000-a000-000000000901'),
  ('product-images', '00000000-0000-4000-a000-000000000901/store-product.jpg', '00000000-0000-4000-a000-000000000901'),
  ('saved-outfits', '00000000-0000-4000-a000-000000000901/outfit.jpg', '00000000-0000-4000-a000-000000000901'),
  ('ai-tryon-uploads', '00000000-0000-4000-a000-000000000902/person.jpg', '00000000-0000-4000-a000-000000000902');

-- Rows that remain after U's account is gone:
-- a starter item definition using one of U's files,
insert into public.default_wardrobe_items (image_url, category)
select 'https://klwolsopucgswhtdlsps.supabase.co/storage/v1/object/public/wardrobe-items/00000000-0000-4000-a000-000000000901/default-tee.png',
       (select category from public.default_wardrobe_items limit 1);
-- V's starter copy pointing at another of U's files,
insert into public.wardrobe_items (user_id, image_url, category, is_default, source)
select '00000000-0000-4000-a000-000000000902',
       'https://klwolsopucgswhtdlsps.supabase.co/storage/v1/object/public/wardrobe-items/00000000-0000-4000-a000-000000000901/starter.png',
       (select category from public.default_wardrobe_items limit 1), true, 'upload';
-- a store product that survived its store (retailer_id set null) using U's file,
update public.products set image_url = 'https://api.azyahstyle.com/storage/v1/object/public/product-images/00000000-0000-4000-a000-000000000901/store-product.jpg'
where id = (select id from public.products order by id limit 1);
-- and V's public outfit using U's outfit picture.
insert into public.fits (user_id, title, is_public, render_path)
values ('00000000-0000-4000-a000-000000000902', 'probe fit', true, 'https://klwolsopucgswhtdlsps.supabase.co/storage/v1/object/public/saved-outfits/00000000-0000-4000-a000-000000000901/outfit.jpg');

select pg_temp.check_fact('Removes', 'U''s file in ' || b || ' (' || n || ')', pg_temp.listed('00000000-0000-4000-a000-000000000901', b, n) = 1)
from (values
  ('ai-tryon-uploads', '00000000-0000-4000-a000-000000000901/person.jpg'),
  ('wardrobe-items', '00000000-0000-4000-a000-000000000901/shirt.png'),
  ('live-cam-snapshots', '00000000-0000-4000-a000-000000000901/snap.jpg'),
  ('event-user-photos', '11111111-1111-4111-8111-111111111111/00000000-0000-4000-a000-000000000901/person_1.jpeg'),
  ('tryon', 'tryon/users/00000000-0000-4000-a000-000000000901/inputs/1.jpeg'),
  ('product-images', 'misc/uploaded-by-u.jpg')) as t(b, n);
select pg_temp.check_fact('Keeps', 'someone else''s file', pg_temp.listed('00000000-0000-4000-a000-000000000901', 'ai-tryon-uploads', '00000000-0000-4000-a000-000000000902/person.jpg') = 0);
select pg_temp.check_fact('Keeps', 'a file used by a starter item', pg_temp.listed('00000000-0000-4000-a000-000000000901', 'wardrobe-items', '00000000-0000-4000-a000-000000000901/default-tee.png') = 0);
select pg_temp.check_fact('Keeps', 'a file used by another person''s starter copy', pg_temp.listed('00000000-0000-4000-a000-000000000901', 'wardrobe-items', '00000000-0000-4000-a000-000000000901/starter.png') = 0);
select pg_temp.check_fact('Keeps', 'a file used by a product that survived its store', pg_temp.listed('00000000-0000-4000-a000-000000000901', 'product-images', '00000000-0000-4000-a000-000000000901/store-product.jpg') = 0);
select pg_temp.check_fact('Keeps', 'a file used by another person''s outfit', pg_temp.listed('00000000-0000-4000-a000-000000000901', 'saved-outfits', '00000000-0000-4000-a000-000000000901/outfit.jpg') = 0);
select pg_temp.check_fact('Keeps', 'nothing for an empty user id', pg_temp.listed_all(null) = 0);

select pg_temp.check_fact('Access', r || ' can not call it',
  not coalesce(has_function_privilege(r, to_regprocedure('public.list_user_storage_objects(uuid)'), 'execute'), true))
from unnest(array['anon', 'authenticated']) r;
select pg_temp.check_fact('Access', 'the server key can call it',
  coalesce(has_function_privilege('service_role', to_regprocedure('public.list_user_storage_objects(uuid)'), 'execute'), false));
select pg_temp.check_fact('Access', 'search path is fixed',
  exists (select 1 from pg_proc where oid = to_regprocedure('public.list_user_storage_objects(uuid)') and proconfig::text like '%search_path=public, storage%'));

select area, probe, expect, outcome, pass from probe_results order by seq;
