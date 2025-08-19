-- Beauty consultant tables for storing consultations and analytics
create table if not exists beauty_consults (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  skin_profile jsonb not null,
  recommendations jsonb not null,
  confidence numeric not null,
  lighting_note text,
  sources jsonb,
  created_at timestamptz not null default now()
);

create table if not exists beauty_consult_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  event text not null,
  payload jsonb,
  ts timestamptz not null default now()
);

-- Enable RLS
alter table beauty_consults enable row level security;
alter table beauty_consult_events enable row level security;

-- RLS policies
create policy beauty_consults_user_rw on beauty_consults
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy beauty_consult_events_user_rw on beauty_consult_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);