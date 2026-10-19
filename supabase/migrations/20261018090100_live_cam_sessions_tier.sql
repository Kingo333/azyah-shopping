-- Live Cam Premium HD: record which tier was requested and which actually served.
-- Existing rows become 'standard'. Apply BEFORE deploying the new
-- live-cam-session-start edge function, which writes these columns.

alter table public.live_cam_sessions
  add column if not exists tier text not null default 'standard',
  add column if not exists tier_served text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'live_cam_sessions_tier_check'
      and conrelid = 'public.live_cam_sessions'::regclass
  ) then
    alter table public.live_cam_sessions
      add constraint live_cam_sessions_tier_check check (tier in ('standard', 'premium'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'live_cam_sessions_tier_served_check'
      and conrelid = 'public.live_cam_sessions'::regclass
  ) then
    alter table public.live_cam_sessions
      add constraint live_cam_sessions_tier_served_check
      check (tier_served is null or tier_served in ('standard', 'premium'));
  end if;
end $$;

comment on column public.live_cam_sessions.tier is 'Tier the shopper asked for: standard | premium';
comment on column public.live_cam_sessions.tier_served is 'Tier the Worker actually served (premium may fall back to standard)';
