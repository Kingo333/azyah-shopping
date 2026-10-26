-- Probes for the private event media migration (event-user-photos and
-- event-tryon-results become private, owner-only).
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

-- U owns the photos and result; O is another shopper who also tried on at the same event.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000201', 'authenticated', 'authenticated', 'u@probe.example.test', '', '{"provider":"email"}', '{"role":"shopper"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000202', 'authenticated', 'authenticated', 'o@probe.example.test', '', '{"provider":"email"}', '{"role":"shopper"}', now(), now());

create temp table probe_ctx as
  select (select id from public.retail_events order by created_at limit 1) as event_id,
         (select id from public.event_brand_products order by created_at limit 1) as product_id;

do $$ declare e uuid; p uuid; begin
  select event_id, product_id into e, p from probe_ctx;
  insert into storage.objects (bucket_id, name, owner) values
    ('event-user-photos', e || '/00000000-0000-4000-a000-000000000201/probe_person.jpg', '00000000-0000-4000-a000-000000000201'),
    ('event-tryon-results', e || '/probe-u-result.png', '00000000-0000-4000-a000-000000000201'),
    ('event-tryon-results', e || '/probe-o-result.png', '00000000-0000-4000-a000-000000000202');
  insert into public.event_tryon_jobs (event_id, product_id, user_id, input_person_path, input_outfit_path, provider, status, output_path) values
    (e, p, '00000000-0000-4000-a000-000000000201', 'probe', 'probe', 'thenewblack', 'succeeded', e || '/probe-u-result.png'),
    (e, p, '00000000-0000-4000-a000-000000000202', 'probe', 'probe', 'thenewblack', 'succeeded', e || '/probe-o-result.png');
end $$;

-- ---------------------------------------------------------------------------
-- Buckets
-- ---------------------------------------------------------------------------
select pg_temp.check_fact('Buckets', b || ' is private', not coalesce((select public from storage.buckets where id = b), true))
from unnest(array['event-user-photos', 'event-tryon-results', 'event-tryon-renders', 'event-photos']) b;

-- ---------------------------------------------------------------------------
-- Shopper photos
-- ---------------------------------------------------------------------------
do $$ declare e uuid; begin
  select event_id into e from probe_ctx;
  perform pg_temp.check_fact('Photos', 'shopper can open their own event photo',
    pg_temp.as_role_bool('authenticated', '00000000-0000-4000-a000-000000000201',
      format($q$select exists (select 1 from storage.objects where bucket_id = 'event-user-photos' and name = %L)$q$, e || '/00000000-0000-4000-a000-000000000201/probe_person.jpg')));
  perform pg_temp.check_fact('Photos', 'another shopper can NOT open it',
    not pg_temp.as_role_bool('authenticated', '00000000-0000-4000-a000-000000000202',
      format($q$select exists (select 1 from storage.objects where bucket_id = 'event-user-photos' and name = %L)$q$, e || '/00000000-0000-4000-a000-000000000201/probe_person.jpg')));
  perform pg_temp.check_fact('Photos', 'logged-out visitor can NOT open it',
    not pg_temp.as_role_bool('anon', null,
      format($q$select exists (select 1 from storage.objects where bucket_id = 'event-user-photos' and name = %L)$q$, e || '/00000000-0000-4000-a000-000000000201/probe_person.jpg')));
  perform pg_temp.probe('Photos', 'shopper uploads into their own folder', 'ok', 'authenticated', '00000000-0000-4000-a000-000000000201',
    format($q$insert into storage.objects (bucket_id, name, owner) values ('event-user-photos', %L, '00000000-0000-4000-a000-000000000201')$q$, e || '/00000000-0000-4000-a000-000000000201/probe_new.jpg'),
    format($q$select exists (select 1 from storage.objects where bucket_id = 'event-user-photos' and name = %L)$q$, e || '/00000000-0000-4000-a000-000000000201/probe_new.jpg'));
  perform pg_temp.probe('Photos', 'shopper uploads into someone else''s folder', 'deny', 'authenticated', '00000000-0000-4000-a000-000000000201',
    format($q$insert into storage.objects (bucket_id, name, owner) values ('event-user-photos', %L, '00000000-0000-4000-a000-000000000201')$q$, e || '/00000000-0000-4000-a000-000000000202/probe_spoof.jpg'),
    format($q$select exists (select 1 from storage.objects where bucket_id = 'event-user-photos' and name = %L)$q$, e || '/00000000-0000-4000-a000-000000000202/probe_spoof.jpg'));
  perform pg_temp.probe('Photos', 'shopper replaces their own photo (upload with upsert)', 'ok', 'authenticated', '00000000-0000-4000-a000-000000000201',
    format($q$update storage.objects set metadata = '{"probe":true}' where bucket_id = 'event-user-photos' and name = %L$q$, e || '/00000000-0000-4000-a000-000000000201/probe_person.jpg'),
    format($q$select metadata->>'probe' = 'true' from storage.objects where bucket_id = 'event-user-photos' and name = %L$q$, e || '/00000000-0000-4000-a000-000000000201/probe_person.jpg'));
end $$;
select pg_temp.check_fact('Photos', 'a delete rule limits shoppers to their own photos',
  exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and cmd = 'DELETE'
          and qual like '%event-user-photos%' and qual like '%foldername%' and qual like '%auth.uid()%'));

-- ---------------------------------------------------------------------------
-- Try-on results
-- ---------------------------------------------------------------------------
do $$ declare e uuid; begin
  select event_id into e from probe_ctx;
  perform pg_temp.check_fact('Results', 'shopper can open their own try-on result',
    pg_temp.as_role_bool('authenticated', '00000000-0000-4000-a000-000000000201',
      format($q$select exists (select 1 from storage.objects where bucket_id = 'event-tryon-results' and name = %L)$q$, e || '/probe-u-result.png')));
  perform pg_temp.check_fact('Results', 'another shopper at the same event can NOT open it',
    not pg_temp.as_role_bool('authenticated', '00000000-0000-4000-a000-000000000202',
      format($q$select exists (select 1 from storage.objects where bucket_id = 'event-tryon-results' and name = %L)$q$, e || '/probe-u-result.png')));
  perform pg_temp.check_fact('Results', 'logged-out visitor can NOT open it',
    not pg_temp.as_role_bool('anon', null,
      format($q$select exists (select 1 from storage.objects where bucket_id = 'event-tryon-results' and name = %L)$q$, e || '/probe-u-result.png')));
end $$;

select area, probe, expect, outcome, pass from probe_results order by seq;
