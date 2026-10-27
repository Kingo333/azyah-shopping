-- Rollback for 20261027115900_stable_media_addresses.sql (cleaned rows stay cleaned).

drop trigger if exists ai_assets_stable_address on public.ai_assets;
drop trigger if exists video_job_logs_stable_address on public.video_job_logs;
drop function if exists public.keep_stable_media_addresses();
drop function if exists public.stable_storage_url(text);
