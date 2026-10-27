-- Before/after check for 20261027080234_pin_function_search_path.sql.
-- Run as ONE call in rollback mode on production: take the "before" snapshot,
-- apply the migration body, take the "after" snapshot, compare, then RAISE so
-- everything rolls back. (Logged-out visitors call the share lookups, so they
-- run as anon here.)

create temp table sp_snap (stage text, k text, v text);

create or replace function pg_temp.snap(stage text) returns void language plpgsql as $$
declare u uuid := (select user_id from public.fits limit 1); o text; i text; c text;
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  set local role anon;
  o := md5(coalesce((select json_agg(t)::text from public.get_public_outfit_by_slug('sarah-fashion-closet-lazy-day') t), 'null'));
  i := md5(coalesce((select json_agg(t)::text from public.get_public_item_by_slug('sarah-fashion-closet-bottom-2') t), 'null'));
  c := md5(coalesce((select json_agg(t)::text from public.get_public_outfit_creator_by_slug('sarah-fashion-closet-lazy-day') t), 'null'));
  reset role;
  insert into sp_snap values (stage, 'outfit', o), (stage, 'item', i), (stage, 'creator', c);
  insert into sp_snap select stage, 'slugify', public.slugify('Hello, World! Été 2026');
  -- share-slug trigger on a new public outfit
  insert into public.fits (user_id, title, is_public) values (u, 'Probe Search Path ' || stage, true);
  insert into sp_snap select stage, 'new_fit_slug', regexp_replace(coalesce((select share_slug from public.fits where title = 'Probe Search Path ' || stage), 'null'), stage, 'X');
end; $$;

select pg_temp.snap('before');
-- (green run: the migration's ALTER FUNCTION lines go here)
select pg_temp.snap('after');

select b.k, b.v as before, a.v as after, b.v = a.v as same
from sp_snap b join sp_snap a on a.k = b.k and a.stage = 'after'
where b.stage = 'before' order by b.k;
