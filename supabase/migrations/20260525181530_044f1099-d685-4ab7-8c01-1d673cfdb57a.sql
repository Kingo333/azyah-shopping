
-- 1. Vault secret dedicated to Gemini trigger. Random if not already set.
do $$
declare
  existing uuid;
begin
  select id into existing from vault.secrets where name = 'gemini_trigger_secret';
  if existing is null then
    perform vault.create_secret(
      encode(gen_random_bytes(32), 'hex'),
      'gemini_trigger_secret',
      'Shared secret for analyze-wardrobe-gemini trigger'
    );
  end if;
end $$;

-- 2. Service-role-only RPC so the edge function can read the vault value.
--    Locked down: REVOKE from PUBLIC, anon, authenticated. Service role bypasses.
create or replace function public.get_gemini_trigger_secret()
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v text;
begin
  select decrypted_secret into v
  from vault.decrypted_secrets
  where name = 'gemini_trigger_secret'
  limit 1;
  return v;
end;
$$;

revoke all on function public.get_gemini_trigger_secret() from public;
revoke all on function public.get_gemini_trigger_secret() from anon, authenticated;

-- 3. New Gemini-specific dispatcher. Reads the dedicated vault secret.
create or replace function public.dispatch_gemini_analysis()
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
  where name = 'gemini_trigger_secret'
  limit 1;

  if trigger_secret is null then
    return new;
  end if;

  perform net.http_post(
    url := project_url || '/functions/v1/analyze-wardrobe-gemini',
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
  -- Never block wardrobe insert/update on analysis dispatch.
  return new;
end;
$$;

-- 4. Swap the wardrobe_items triggers from the old FashionCLIP-named dispatcher
--    to the new Gemini-specific one.
drop trigger if exists wardrobe_items_fashionclip_dispatch_ins on public.wardrobe_items;
drop trigger if exists wardrobe_items_fashionclip_dispatch_upd on public.wardrobe_items;
drop trigger if exists wardrobe_items_gemini_dispatch_ins on public.wardrobe_items;
drop trigger if exists wardrobe_items_gemini_dispatch_upd on public.wardrobe_items;

create trigger wardrobe_items_gemini_dispatch_ins
  after insert on public.wardrobe_items
  for each row execute function public.dispatch_gemini_analysis();

create trigger wardrobe_items_gemini_dispatch_upd
  after update of image_url, image_bg_removed_url, category on public.wardrobe_items
  for each row execute function public.dispatch_gemini_analysis();
