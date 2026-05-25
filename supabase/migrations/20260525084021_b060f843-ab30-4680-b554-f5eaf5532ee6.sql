
-- Enable pg_net for async HTTP calls from triggers
create extension if not exists pg_net with schema extensions;

-- Vault secret used by trigger -> edge function (random unless already set)
do $$
declare
  existing uuid;
begin
  select id into existing from vault.secrets where name = 'fashionclip_trigger_secret';
  if existing is null then
    perform vault.create_secret(encode(gen_random_bytes(32), 'hex'), 'fashionclip_trigger_secret', 'Shared secret for analyze-wardrobe-fashionclip trigger');
  end if;
end $$;

-- Analysis cache table
create table if not exists public.wardrobe_garment_analysis (
  id uuid primary key default gen_random_uuid(),
  wardrobe_item_id uuid not null references public.wardrobe_items(id) on delete cascade,
  user_id uuid not null,
  status text not null default 'pending' check (status in ('pending','complete','failed','skipped')),
  metadata jsonb,
  prompt_hint text,
  confidence numeric,
  image_hash text,
  source_image_url text,
  model_name text,
  analysis_version text not null default 'fashionclip-v1',
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (wardrobe_item_id)
);

create index if not exists idx_wga_user on public.wardrobe_garment_analysis(user_id);
create index if not exists idx_wga_status on public.wardrobe_garment_analysis(status);

alter table public.wardrobe_garment_analysis enable row level security;

drop policy if exists "Users read own analysis" on public.wardrobe_garment_analysis;
create policy "Users read own analysis"
  on public.wardrobe_garment_analysis for select
  using (auth.uid() = user_id);

-- No insert/update/delete policies: only service role (used by Edge Function) can write.

-- updated_at trigger
create or replace function public.wga_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists wga_updated_at on public.wardrobe_garment_analysis;
create trigger wga_updated_at before update on public.wardrobe_garment_analysis
for each row execute function public.wga_set_updated_at();

-- Async dispatcher: called on wardrobe_items insert/update of relevant columns
create or replace function public.dispatch_fashionclip_analysis()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  trigger_secret text;
  project_url text := 'https://klwolsopucgswhtdlsps.supabase.co';
begin
  select decrypted_secret into trigger_secret
  from vault.decrypted_secrets
  where name = 'fashionclip_trigger_secret'
  limit 1;

  if trigger_secret is null then
    return new;
  end if;

  -- Fire-and-forget HTTP POST to edge function
  perform net.http_post(
    url := project_url || '/functions/v1/analyze-wardrobe-fashionclip',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-trigger-secret', trigger_secret
    ),
    body := jsonb_build_object(
      'wardrobe_item_id', new.id,
      'user_id', new.user_id,
      'force', false
    ),
    timeout_milliseconds := 5000
  );

  return new;
exception when others then
  -- Never block wardrobe insert/update on analysis dispatch
  return new;
end;
$$;

drop trigger if exists wardrobe_items_fashionclip_dispatch_ins on public.wardrobe_items;
create trigger wardrobe_items_fashionclip_dispatch_ins
  after insert on public.wardrobe_items
  for each row execute function public.dispatch_fashionclip_analysis();

drop trigger if exists wardrobe_items_fashionclip_dispatch_upd on public.wardrobe_items;
create trigger wardrobe_items_fashionclip_dispatch_upd
  after update of image_url, image_bg_removed_url, category on public.wardrobe_items
  for each row execute function public.dispatch_fashionclip_analysis();
