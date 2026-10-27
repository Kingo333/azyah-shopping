-- Probes for 20261027125623_stable_media_addresses.sql: the database never
-- keeps a temporary storage link (with a token), whatever app version saves it.
--
-- On a branch, run as-is. On PRODUCTION, never run as-is: send the whole file
-- as ONE call (one transaction) and replace the final SELECT with a DO block
-- that RAISEs the results, so everything rolls back.

drop table if exists pg_temp.probe_results;
create temp table probe_results (seq serial primary key, area text, probe text, expect text, outcome text, pass boolean);

create or replace function pg_temp.check_fact(area text, probe text, fact boolean) returns void language sql as $$
  insert into probe_results(area, probe, expect, outcome, pass) values (area, probe, 'ok', case when fact then 'true' else 'false' end, coalesce(fact, false)); $$;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000a01', 'authenticated', 'authenticated', 'ua@probe.example.test', '', '{"provider":"email"}', '{"role":"shopper"}', now(), now());

insert into public.ai_assets (id, user_id, asset_url) values
  ('00000000-0000-4000-a000-0000000000a1', '00000000-0000-4000-a000-000000000a01',
   'https://api.azyahstyle.com/storage/v1/object/sign/ai-tryon-results/00000000-0000-4000-a000-000000000a01/1.png?token=abc.def'),
  ('00000000-0000-4000-a000-0000000000a2', '00000000-0000-4000-a000-000000000a01', 'https://thenewblack.ai/files/x.png?sig=1'),
  ('00000000-0000-4000-a000-0000000000a3', '00000000-0000-4000-a000-000000000a01',
   'https://klwolsopucgswhtdlsps.supabase.co/storage/v1/object/public/ai-tryon-results/00000000-0000-4000-a000-000000000a01/3.png');
insert into public.video_job_logs (user_id, action, input_image_url, used_image_url) values
  ('00000000-0000-4000-a000-000000000a01', 'probe',
   'https://klwolsopucgswhtdlsps.supabase.co/storage/v1/object/sign/ai-tryon-uploads/00000000-0000-4000-a000-000000000a01/person_1.jpg?token=t1',
   'https://klwolsopucgswhtdlsps.supabase.co/storage/v1/object/sign/tnb-video-inputs/00000000-0000-4000-a000-000000000a01/in.jpg?token=t2');

select pg_temp.check_fact('Gallery', 'a temporary link is saved as the permanent address',
  (select asset_url from public.ai_assets where id = '00000000-0000-4000-a000-0000000000a1')
  = 'https://api.azyahstyle.com/storage/v1/object/public/ai-tryon-results/00000000-0000-4000-a000-000000000a01/1.png');
select pg_temp.check_fact('Gallery', 'an outside address is kept as it is',
  (select asset_url from public.ai_assets where id = '00000000-0000-4000-a000-0000000000a2') = 'https://thenewblack.ai/files/x.png?sig=1');
select pg_temp.check_fact('Gallery', 'a permanent address is kept as it is',
  (select asset_url from public.ai_assets where id = '00000000-0000-4000-a000-0000000000a3')
  = 'https://klwolsopucgswhtdlsps.supabase.co/storage/v1/object/public/ai-tryon-results/00000000-0000-4000-a000-000000000a01/3.png');
update public.ai_assets set asset_url = 'https://x.supabase.co/storage/v1/object/sign/ai-tryon-results/u/9.png?token=zz' where id = '00000000-0000-4000-a000-0000000000a3';
select pg_temp.check_fact('Gallery', 'changing an address to a temporary link saves the permanent one',
  (select asset_url from public.ai_assets where id = '00000000-0000-4000-a000-0000000000a3') = 'https://x.supabase.co/storage/v1/object/public/ai-tryon-results/u/9.png');
select pg_temp.check_fact('Video logs', 'input and used photo links are saved as permanent addresses',
  exists (select 1 from public.video_job_logs where user_id = '00000000-0000-4000-a000-000000000a01'
          and input_image_url = 'https://klwolsopucgswhtdlsps.supabase.co/storage/v1/object/public/ai-tryon-uploads/00000000-0000-4000-a000-000000000a01/person_1.jpg'
          and used_image_url = 'https://klwolsopucgswhtdlsps.supabase.co/storage/v1/object/public/tnb-video-inputs/00000000-0000-4000-a000-000000000a01/in.jpg'));
select pg_temp.check_fact('Existing rows', 'no saved temporary links left',
  not exists (select 1 from public.ai_assets where asset_url ~ '/storage/v1/object/(sign|authenticated)/')
  and not exists (select 1 from public.video_job_logs where coalesce(input_image_url, '') || ' ' || coalesce(used_image_url, '') ~ '/storage/v1/object/(sign|authenticated)/'));

do $$ begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-4000-a000-000000000a01', 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.ai_assets (id, user_id, asset_url) values ('00000000-0000-4000-a000-0000000000c1', '00000000-0000-4000-a000-000000000a01',
    'https://api.azyahstyle.com/storage/v1/object/sign/ai-tryon-results/00000000-0000-4000-a000-000000000a01/c.png?token=q');
  reset role;
  perform pg_temp.check_fact('Gallery', 'a shopper''s own save through the app is cleaned too',
    (select asset_url from public.ai_assets where id = '00000000-0000-4000-a000-0000000000c1') = 'https://api.azyahstyle.com/storage/v1/object/public/ai-tryon-results/00000000-0000-4000-a000-000000000a01/c.png');
end $$;

select area, probe, expect, outcome, pass from probe_results order by seq;
