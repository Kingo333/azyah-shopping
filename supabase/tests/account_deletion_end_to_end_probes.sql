-- End-to-end probe for account deletion (delete-account order): the real
-- delete_user_completely runs first, then list_user_storage_objects.
-- Needs 20261027172029_list_user_storage_objects.sql.
--
-- On PRODUCTION, never run as-is: send the whole file as ONE call (one
-- transaction) and replace the final SELECT with a DO block that RAISEs the
-- results, so everything (including the deletion) rolls back.

drop table if exists pg_temp.probe_results;
create temp table probe_results (seq serial primary key, area text, probe text, expect text, outcome text, pass boolean);
create or replace function pg_temp.check_fact(area text, probe text, fact boolean) returns void language sql as $$
  insert into probe_results(area, probe, expect, outcome, pass) values (area, probe, 'ok', case when fact then 'true' else 'false' end, coalesce(fact, false)); $$;

-- U deletes their account; V keeps theirs.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000b01', 'authenticated', 'authenticated', 'ub@probe.example.test', '', '{"provider":"email"}', '{"role":"shopper"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000b02', 'authenticated', 'authenticated', 'vb@probe.example.test', '', '{"provider":"email"}', '{"role":"shopper"}', now(), now());
insert into storage.objects (bucket_id, name, owner) values
  ('wardrobe-items', '00000000-0000-4000-a000-000000000b01/own.png', '00000000-0000-4000-a000-000000000b01'),
  ('wardrobe-items', '00000000-0000-4000-a000-000000000b01/starter.png', '00000000-0000-4000-a000-000000000b01'),
  ('saved-outfits', '00000000-0000-4000-a000-000000000b01/fit.jpg', '00000000-0000-4000-a000-000000000b01'),
  ('ai-tryon-uploads', '00000000-0000-4000-a000-000000000b01/p.jpg', '00000000-0000-4000-a000-000000000b01');
-- U's closet item shared for reuse, and V's community copy of it
insert into public.wardrobe_items (user_id, image_url, category, public_reuse_permitted) values
  ('00000000-0000-4000-a000-000000000b01', 'https://klwolsopucgswhtdlsps.supabase.co/storage/v1/object/public/wardrobe-items/00000000-0000-4000-a000-000000000b01/own.png', (select category from public.default_wardrobe_items limit 1), true);
insert into public.wardrobe_items (user_id, image_url, category, source, attribution_user_id) values
  ('00000000-0000-4000-a000-000000000b02', 'https://klwolsopucgswhtdlsps.supabase.co/storage/v1/object/public/wardrobe-items/00000000-0000-4000-a000-000000000b01/own.png', (select category from public.default_wardrobe_items limit 1), 'community_copy', '00000000-0000-4000-a000-000000000b01');
-- V's starter item uses U's file (U holds the starter files, like shopper@test.com)
insert into public.wardrobe_items (user_id, image_url, category, is_default, source) values
  ('00000000-0000-4000-a000-000000000b02', 'https://klwolsopucgswhtdlsps.supabase.co/storage/v1/object/public/wardrobe-items/00000000-0000-4000-a000-000000000b01/starter.png', (select category from public.default_wardrobe_items limit 1), true, 'upload');
-- U's public outfit
insert into public.fits (user_id, title, is_public, render_path) values ('00000000-0000-4000-a000-000000000b01', 'probe fit', true, 'https://klwolsopucgswhtdlsps.supabase.co/storage/v1/object/public/saved-outfits/00000000-0000-4000-a000-000000000b01/fit.jpg');

create temp table before_delete as select bucket_id || '/' || name as f from public.list_user_storage_objects('00000000-0000-4000-a000-000000000b01');
create temp table del as select public.delete_user_completely('00000000-0000-4000-a000-000000000b01'::uuid) as r;
create temp table after_delete as select bucket_id || '/' || name as f from public.list_user_storage_objects('00000000-0000-4000-a000-000000000b01');

select pg_temp.check_fact('Order', 'before the data is deleted, files still in use are not listed', not exists (select 1 from before_delete where f like '%/own.png' or f like '%/fit.jpg'));
select pg_temp.check_fact('Delete', 'the database step succeeded', coalesce(((select r from del)->>'success')::boolean, false));
select pg_temp.check_fact('Delete', 'V''s community copy was removed with the original', not exists (select 1 from public.wardrobe_items where user_id = '00000000-0000-4000-a000-000000000b02' and source = 'community_copy'));
select pg_temp.check_fact('Delete', 'V''s starter item stays', exists (select 1 from public.wardrobe_items where user_id = '00000000-0000-4000-a000-000000000b02' and is_default));
select pg_temp.check_fact('Files', 'U''s shared closet photo is removed (nobody uses it now)', exists (select 1 from after_delete where f = 'wardrobe-items/00000000-0000-4000-a000-000000000b01/own.png'));
select pg_temp.check_fact('Files', 'U''s outfit picture is removed', exists (select 1 from after_delete where f = 'saved-outfits/00000000-0000-4000-a000-000000000b01/fit.jpg'));
select pg_temp.check_fact('Files', 'U''s AI Studio photo is removed', exists (select 1 from after_delete where f = 'ai-tryon-uploads/00000000-0000-4000-a000-000000000b01/p.jpg'));
select pg_temp.check_fact('Files', 'the starter file V still uses is kept', not exists (select 1 from after_delete where f = 'wardrobe-items/00000000-0000-4000-a000-000000000b01/starter.png'));

select area, probe, expect, outcome, pass from probe_results order by seq;
