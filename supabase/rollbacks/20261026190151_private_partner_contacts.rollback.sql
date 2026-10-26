-- ROLLBACK for 20261026190151_private_partner_contacts.sql
-- Puts the emails back on brands/retailers (public again), removes the private
-- tables and triggers, and restores the five contact functions exactly as they
-- were on 2026-10-26. Run by hand only if needed.

begin;

-- The private tables' foreign keys are deferred; check them now so the
-- tables can be dropped inside this transaction.
set constraints all immediate;

drop trigger if exists move_brand_contact_email on public.brands;
drop trigger if exists move_retailer_contact_email on public.retailers;

update public.brands b set contact_email = c.contact_email from public.brand_contacts c where c.brand_id = b.id;
update public.retailers r set contact_email = c.contact_email from public.retailer_contacts c where c.retailer_id = r.id;

drop function if exists public.move_brand_contact_email();
drop function if exists public.move_retailer_contact_email();
drop table if exists public.brand_contacts;
drop table if exists public.retailer_contacts;

CREATE OR REPLACE FUNCTION public.get_brand_contact_info(brand_id_param uuid)
 RETURNS TABLE(contact_email text, owner_user_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only return contact info to authenticated users
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access contact information';
  END IF;

  -- Log access attempt
  PERFORM public.log_user_data_access('GET_BRAND_CONTACT', 'brands', brand_id_param);

  RETURN QUERY
  SELECT b.contact_email, b.owner_user_id
  FROM public.brands b
  WHERE b.id = brand_id_param;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_brand_contact_secure(brand_id_param uuid)
 RETURNS TABLE(contact_email text, owner_user_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only return contact info to authenticated users
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access contact information';
  END IF;

  -- Log access attempt for business intelligence protection
  PERFORM public.log_user_data_access_enhanced('GET_BRAND_CONTACT_SECURE', 'brands',
    brand_id_param,
    jsonb_build_object('contact_access_requested', true, 'brand_id', brand_id_param)
  );

  RETURN QUERY
  SELECT b.contact_email, b.owner_user_id
  FROM public.brands b
  WHERE b.id = brand_id_param;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_retailer_contact_info(retailer_id_param uuid)
 RETURNS TABLE(contact_email text, owner_user_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only return contact info to authenticated users
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access contact information';
  END IF;

  -- Log access attempt
  PERFORM public.log_user_data_access('GET_RETAILER_CONTACT', 'retailers', retailer_id_param);

  RETURN QUERY
  SELECT r.contact_email, r.owner_user_id
  FROM public.retailers r
  WHERE r.id = retailer_id_param;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_retailer_contact_info_secure(retailer_id_param uuid)
 RETURNS TABLE(contact_email text, owner_user_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only return contact info to authenticated users
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access contact information';
  END IF;

  -- Log access attempt for business intelligence protection
  PERFORM public.log_user_data_access_enhanced('GET_RETAILER_CONTACT_SECURE', 'retailers',
    retailer_id_param,
    jsonb_build_object('contact_access_requested', true, 'retailer_id', retailer_id_param)
  );

  RETURN QUERY
  SELECT r.contact_email, r.owner_user_id
  FROM public.retailers r
  WHERE r.id = retailer_id_param;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_retailer_contact_secure(retailer_id_param uuid)
 RETURNS TABLE(contact_email text, owner_user_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only return contact info to authenticated users
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access contact information';
  END IF;

  -- Log access attempt for business intelligence protection
  PERFORM public.log_user_data_access_enhanced('GET_RETAILER_CONTACT_SECURE', 'retailers',
    retailer_id_param,
    jsonb_build_object('contact_access_requested', true, 'retailer_id', retailer_id_param)
  );

  RETURN QUERY
  SELECT r.contact_email, r.owner_user_id
  FROM public.retailers r
  WHERE r.id = retailer_id_param;
END;
$function$;

grant execute on function public.get_brand_contact_info(uuid), public.get_brand_contact_secure(uuid),
  public.get_retailer_contact_info(uuid), public.get_retailer_contact_info_secure(uuid),
  public.get_retailer_contact_secure(uuid) to public, anon, authenticated;

commit;
