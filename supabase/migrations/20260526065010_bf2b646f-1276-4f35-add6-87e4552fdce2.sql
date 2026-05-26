
DO $$
declare
  trigger_secret text;
  project_url text := 'https://klwolsopucgswhtdlsps.supabase.co';
  ids uuid[] := ARRAY[
    'd0973874-41cd-4bda-b115-95d725af749c'::uuid,
    'c54ebeda-5cc6-40b8-ad9a-00bb0d0a630f'::uuid,
    'b2513669-b82d-4640-bda8-e1e501991a4c'::uuid
  ];
  iid uuid;
  uid uuid;
begin
  select decrypted_secret into trigger_secret
  from vault.decrypted_secrets
  where name = 'gemini_trigger_secret'
  limit 1;

  if trigger_secret is null then
    raise notice 'no vault secret found, aborting';
    return;
  end if;

  foreach iid in array ids loop
    select user_id into uid from public.wardrobe_items where id = iid;
    perform net.http_post(
      url := project_url || '/functions/v1/analyze-wardrobe-gemini',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-trigger-secret', trigger_secret
      ),
      body := jsonb_build_object(
        'wardrobe_item_id', iid,
        'user_id', uid,
        'force', true
      ),
      timeout_milliseconds := 60000
    );
  end loop;
end $$;
