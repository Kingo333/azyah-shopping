-- Probes for 20261027171126_private_server_only_folders.sql (people-photo folders
-- only the server reads: video inputs, photo search, old closet folder).
-- Needs 20261027125651 applied first.
--
-- On a branch, run as-is. On PRODUCTION, never run as-is: send the whole file
-- as ONE call (one transaction) and replace the final SELECT with a DO block
-- that RAISEs the results, so everything rolls back.

drop table if exists pg_temp.probe_results;
create temp table probe_results (seq serial primary key, area text, probe text, expect text, outcome text, pass boolean);

create or replace function pg_temp.check_fact(area text, probe text, fact boolean) returns void language sql as $$
  insert into probe_results(area, probe, expect, outcome, pass) values (area, probe, 'ok', case when fact then 'true' else 'false' end, coalesce(fact, false)); $$;

-- Count rows a role can see; errors count as 0.
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

-- Run a write as a role; true when it changed the row.
create or replace function pg_temp.owner_upsert(uid uuid, bucket text, object_name text) returns boolean language plpgsql as $$
declare ok boolean := false;
begin
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into storage.objects (bucket_id, name) values (bucket, object_name);
    perform 1 from storage.objects where bucket_id = bucket and name = object_name;
    update storage.objects set metadata = '{"probe": 8}' where bucket_id = bucket and name = object_name;
    reset role;
    ok := (select metadata->>'probe' = '8' from storage.objects where bucket_id = bucket and name = object_name);
  exception when others then ok := false;
  end;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  return coalesce(ok, false);
end; $$;

-- O owns the photos; X is another shopper.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000701', 'authenticated', 'authenticated', 'o7@probe.example.test', '', '{"provider":"email"}', '{"role":"shopper"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000702', 'authenticated', 'authenticated', 'x7@probe.example.test', '', '{"provider":"email"}', '{"role":"shopper"}', now(), now());

insert into storage.objects (bucket_id, name, owner)
select b, '00000000-0000-4000-a000-000000000701/probe.jpg', '00000000-0000-4000-a000-000000000701'
from unnest(array['tnb-video-inputs', 'search-images', 'wardrobe']) b;

select pg_temp.check_fact('Folders', b || ' is private', not coalesce((select public from storage.buckets where id = b), true))
from unnest(array['tnb-video-inputs', 'search-images', 'wardrobe']) b;
select pg_temp.check_fact('Folders', 'logged-out visitor can not see a photo in ' || b,
  pg_temp.visible('anon', null, b, '00000000-0000-4000-a000-000000000701/probe.jpg') = 0)
from unnest(array['tnb-video-inputs', 'search-images', 'wardrobe']) b;
select pg_temp.check_fact('Folders', 'another user can not see someone''s photo in ' || b,
  pg_temp.visible('authenticated', '00000000-0000-4000-a000-000000000702', b, '00000000-0000-4000-a000-000000000701/probe.jpg') = 0)
from unnest(array['tnb-video-inputs', 'search-images', 'wardrobe']) b;
select pg_temp.check_fact('Folders', 'owner can see their own photo in ' || b,
  pg_temp.visible('authenticated', '00000000-0000-4000-a000-000000000701', b, '00000000-0000-4000-a000-000000000701/probe.jpg') = 1)
from unnest(array['tnb-video-inputs', 'search-images', 'wardrobe']) b;
select pg_temp.check_fact('Folders', 'server key can see every photo in ' || b,
  pg_temp.visible('service_role', null, b, '00000000-0000-4000-a000-000000000701/probe.jpg') = 1)
from unnest(array['tnb-video-inputs', 'search-images', 'wardrobe']) b;
select pg_temp.check_fact('Rules', 'no "anyone can view" rule left on ' || b,
  not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and cmd in ('SELECT', 'ALL')
              and qual like '%''' || b || '''%' and qual not like '%auth.uid()%'))
from unnest(array['tnb-video-inputs', 'search-images', 'wardrobe']) b;

select area, probe, expect, outcome, pass from probe_results order by seq;
