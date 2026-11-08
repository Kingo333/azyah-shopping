-- Sales mode: record of sales-code attempts, used only by the sales-demo-login edge function
-- (service role) to lock out guessing: 5 wrong codes per device, 40 overall, per 15 minutes.
-- Stores a SHA-256 hash of the caller's IP, never the IP or the typed code.
create table if not exists public.sales_unlock_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  ok boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists sales_unlock_attempts_recent_idx
  on public.sales_unlock_attempts (created_at desc) where ok = false;

-- Row level security on, no policies: app users (anon / authenticated) can neither read nor write.
alter table public.sales_unlock_attempts enable row level security;
revoke all on public.sales_unlock_attempts from anon, authenticated;
