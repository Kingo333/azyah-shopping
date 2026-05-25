-- 1. Revert trigger to FashionCLIP analyzer
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
  return new;
end;
$function$;

-- 2. SECURITY DEFINER RPC so edge functions can read the trigger secret
-- (vault.decrypted_secrets is not exposed via PostgREST, which is why edge
--  function reads returned null and Gemini calls fell through to 401).
CREATE OR REPLACE FUNCTION public.get_fashionclip_trigger_secret()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault'
AS $function$
declare
  s text;
begin
  select decrypted_secret into s
  from vault.decrypted_secrets
  where name = 'fashionclip_trigger_secret'
  limit 1;
  return s;
end;
$function$;

REVOKE ALL ON FUNCTION public.get_fashionclip_trigger_secret() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_fashionclip_trigger_secret() TO service_role;