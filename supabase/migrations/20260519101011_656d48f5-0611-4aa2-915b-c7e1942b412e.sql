
-- Live Cam: sessions
create table public.live_cam_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  garment_id text not null,
  garment_source text not null check (garment_source in ('product','event_brand_product','wardrobe_item')),
  pod_id text,
  ws_url text,
  status text not null default 'starting'
    check (status in ('starting','running','ended','failed')),
  error_message text,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index live_cam_sessions_user_idx on public.live_cam_sessions(user_id, started_at desc);

-- Live Cam: snapshots
create table public.live_cam_snapshots (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_cam_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  garment_id text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index live_cam_snapshots_user_idx on public.live_cam_snapshots(user_id, created_at desc);

-- Live Cam: per-garment tuning sidecar
create table public.live_cam_garment_settings (
  garment_id text primary key,
  garment_source text not null check (garment_source in ('product','event_brand_product','wardrobe_item')),
  reference_image_url text,
  prompt_hint text,
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.live_cam_sessions enable row level security;
alter table public.live_cam_snapshots enable row level security;
alter table public.live_cam_garment_settings enable row level security;

create policy live_cam_sessions_owner_select on public.live_cam_sessions
  for select using (auth.uid() = user_id);
create policy live_cam_sessions_owner_insert on public.live_cam_sessions
  for insert with check (auth.uid() = user_id);
create policy live_cam_sessions_owner_update on public.live_cam_sessions
  for update using (auth.uid() = user_id);

create policy live_cam_snapshots_owner_select on public.live_cam_snapshots
  for select using (auth.uid() = user_id);
create policy live_cam_snapshots_owner_insert on public.live_cam_snapshots
  for insert with check (auth.uid() = user_id);

create policy live_cam_garment_settings_read on public.live_cam_garment_settings
  for select using (auth.role() = 'authenticated');

-- Private storage bucket
insert into storage.buckets (id, name, public)
values ('live-cam-snapshots', 'live-cam-snapshots', false)
on conflict (id) do nothing;

-- Storage policies: owner-only access under {user_id}/ prefix
create policy "live_cam_snapshots_owner_read"
on storage.objects for select
using (
  bucket_id = 'live-cam-snapshots'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "live_cam_snapshots_owner_insert"
on storage.objects for insert
with check (
  bucket_id = 'live-cam-snapshots'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "live_cam_snapshots_owner_update"
on storage.objects for update
using (
  bucket_id = 'live-cam-snapshots'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "live_cam_snapshots_owner_delete"
on storage.objects for delete
using (
  bucket_id = 'live-cam-snapshots'
  and auth.uid()::text = (storage.foldername(name))[1]
);
