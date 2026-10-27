-- Probes for 20261027171337_closet_no_listing.sql (closet and outfit folders
-- stay public by link, but nobody can list everyone's files).
-- Needs 20261027125651 applied first (owner read rule for saved-outfits).
--
-- On a branch, run as-is. On PRODUCTION, never run as-is: send the whole file
-- as ONE call (one transaction) and replace the final SELECT with a DO block
-- that RAISEs the results, so everything rolls back.

drop table if exists pg_temp.probe_results;
create temp table probe_results (seq serial primary key, area text, probe text, expect text, outcome text, pass boolean);

create or replace function pg_temp.check_fact(area text, probe text, fact boolean) returns void language sql as $$
  insert into probe_results(area, probe, expect, outcome, pass) values (area, probe, 'ok', case when fact then 'true' else 'false' end, coalesce(fact, false)); $$;

create or replace function pg_temp.visible(as_role text, uid uuid, bucket text, object_name text) returns int language plpgsql as $$
declare n int := 0;
begin
  begin
    perform set_config('request.jwt.claims', case when uid is null then json_build_object('role', as_role)::text else json_build_object('sub', uid, 'role', as_role)::text end, true);
    execute format('set local role %I', as_role);
    execute format('select count(*) from storage.objects where bucket_id = %L and name = %L', bucket, object_name) into n;
    reset role;
  exception when others then n := 0;
  end;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  return n;
end; $$;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000801', 'authenticated', 'authenticated', 'o8@probe.example.test', '', '{"provider":"email"}', '{"role":"shopper"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000802', 'authenticated', 'authenticated', 'x8@probe.example.test', '', '{"provider":"email"}', '{"role":"shopper"}', now(), now());

insert into storage.objects (bucket_id, name, owner)
select b, '00000000-0000-4000-a000-000000000801/probe.jpg', '00000000-0000-4000-a000-000000000801'
from unnest(array['wardrobe-items', 'saved-outfits']) b;

select pg_temp.check_fact('Closet', b || ' still opens by link (folder public)', coalesce((select public from storage.buckets where id = b), false))
from unnest(array['wardrobe-items', 'saved-outfits']) b;
select pg_temp.check_fact('Closet', 'logged-out visitor can not list files in ' || b,
  pg_temp.visible('anon', null, b, '00000000-0000-4000-a000-000000000801/probe.jpg') = 0)
from unnest(array['wardrobe-items', 'saved-outfits']) b;
select pg_temp.check_fact('Closet', 'another user can not list someone''s files in ' || b,
  pg_temp.visible('authenticated', '00000000-0000-4000-a000-000000000802', b, '00000000-0000-4000-a000-000000000801/probe.jpg') = 0)
from unnest(array['wardrobe-items', 'saved-outfits']) b;
select pg_temp.check_fact('Closet', 'owner still sees their own files in ' || b,
  pg_temp.visible('authenticated', '00000000-0000-4000-a000-000000000801', b, '00000000-0000-4000-a000-000000000801/probe.jpg') = 1)
from unnest(array['wardrobe-items', 'saved-outfits']) b;

select area, probe, expect, outcome, pass from probe_results order by seq;
