CREATE OR REPLACE FUNCTION public.dispatch_fashionclip_analysis()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'vault'
AS $function$
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

  -- Fire-and-forget HTTP POST to Gemini analyzer (FashionCLIP paused; flip URL back to re-enable)
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
  return new;
end;
$function$;