-- Never keep a temporary storage link (it carries a token and expires) in the
-- database, whatever app version saves it: older app builds (including iPhone
-- builds already installed) save whatever result link the server returns.
-- Apply BEFORE deploying the try-on functions that return temporary links.
-- Design: docs/superpowers/specs/2026-10-27-private-photos-design.md.
-- Probes: supabase/tests/stable_media_address_probes.sql.

create or replace function public.stable_storage_url(url text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when url is null then null
    else regexp_replace(url, '^(https?://[^/]+/storage/v1/object/)(sign|authenticated)/([^?#]+).*$', '\1public/\3')
  end
$$;

create or replace function public.keep_stable_media_addresses()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_table_name = 'ai_assets' then
    new.asset_url := public.stable_storage_url(new.asset_url);
  elsif tg_table_name = 'video_job_logs' then
    new.input_image_url := public.stable_storage_url(new.input_image_url);
    new.used_image_url := public.stable_storage_url(new.used_image_url);
  end if;
  return new;
end;
$$;

revoke all on function public.keep_stable_media_addresses() from public, anon, authenticated;

drop trigger if exists ai_assets_stable_address on public.ai_assets;
create trigger ai_assets_stable_address
  before insert or update of asset_url on public.ai_assets
  for each row execute function public.keep_stable_media_addresses();

drop trigger if exists video_job_logs_stable_address on public.video_job_logs;
create trigger video_job_logs_stable_address
  before insert or update of input_image_url, used_image_url on public.video_job_logs
  for each row execute function public.keep_stable_media_addresses();

-- Clean any rows saved before this (none on 2026-10-27; kept for safety).
update public.ai_assets set asset_url = asset_url
where asset_url ~ '/storage/v1/object/(sign|authenticated)/';
update public.video_job_logs set input_image_url = input_image_url, used_image_url = used_image_url
where coalesce(input_image_url, '') || ' ' || coalesce(used_image_url, '') ~ '/storage/v1/object/(sign|authenticated)/';
