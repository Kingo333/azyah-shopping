alter table public.live_cam_sessions
  add column if not exists gpu_used text,
  add column if not exists cloud_used text,
  add column if not exists attempts jsonb;