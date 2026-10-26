-- Private partner contact emails.
--
-- STATUS: PROPOSED. Not applied. Needs owner approval. Rename to the version
-- live records when applied.
-- Review: docs/redesign/PARTNER_AND_EVENTS_REVIEW.md (P3).
-- Tests:  supabase/tests/partner_contact_probes.sql (rollback mode on production).
-- Rollback: supabase/rollbacks/20261026232000_private_partner_contacts.rollback.sql
--
-- Problem: brands.contact_email and retailers.contact_email were readable by
-- everyone (the public read rule covers every column), and five unused
-- functions (get_brand_contact_info, ...) gave them to any signed-in user.
--
-- Fix, without touching any shopper screen (feeds load brands with "*"):
--   - Emails move to private tables brand_contacts / retailer_contacts that
--     only the owner can read or change.
--   - The public columns stay but are always empty. A trigger moves any email
--     written to them (by today's live app or a new signup) into the private
--     table; an empty value never wipes the stored email.
--   - The five contact functions only answer the owner.

begin;

-- Private tables ---------------------------------------------------------------
create table if not exists public.brand_contacts (
  brand_id uuid primary key references public.brands(id) on delete cascade deferrable initially deferred,
  contact_email text,
  updated_at timestamptz not null default now()
);
create table if not exists public.retailer_contacts (
  retailer_id uuid primary key references public.retailers(id) on delete cascade deferrable initially deferred,
  contact_email text,
  updated_at timestamptz not null default now()
);
alter table public.brand_contacts enable row level security;
alter table public.retailer_contacts enable row level security;

revoke all on public.brand_contacts, public.retailer_contacts from public, anon, authenticated;
grant select, insert, update, delete on public.brand_contacts, public.retailer_contacts to authenticated;
grant all on public.brand_contacts, public.retailer_contacts to service_role;

create policy brand_contacts_owner_all on public.brand_contacts
  for all to authenticated
  using (exists (select 1 from public.brands b where b.id = brand_contacts.brand_id and b.owner_user_id = (select auth.uid())))
  with check (exists (select 1 from public.brands b where b.id = brand_contacts.brand_id and b.owner_user_id = (select auth.uid())));
create policy retailer_contacts_owner_all on public.retailer_contacts
  for all to authenticated
  using (exists (select 1 from public.retailers r where r.id = retailer_contacts.retailer_id and r.owner_user_id = (select auth.uid())))
  with check (exists (select 1 from public.retailers r where r.id = retailer_contacts.retailer_id and r.owner_user_id = (select auth.uid())));

-- Move existing emails ---------------------------------------------------------
insert into public.brand_contacts (brand_id, contact_email)
  select id, trim(contact_email) from public.brands where nullif(trim(contact_email), '') is not null
  on conflict (brand_id) do update set contact_email = excluded.contact_email, updated_at = now();
insert into public.retailer_contacts (retailer_id, contact_email)
  select id, trim(contact_email) from public.retailers where nullif(trim(contact_email), '') is not null
  on conflict (retailer_id) do update set contact_email = excluded.contact_email, updated_at = now();
update public.brands set contact_email = null where contact_email is not null;
update public.retailers set contact_email = null where contact_email is not null;

-- Keep the public columns empty from now on ------------------------------------
-- SECURITY DEFINER so it can write the private row while the brand row is being
-- created (the owner's RLS check can't see it yet). It only ever writes the
-- contact of the row the caller was already allowed to insert or update.
create or replace function public.move_brand_contact_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if nullif(trim(new.contact_email), '') is not null then
    insert into public.brand_contacts (brand_id, contact_email, updated_at)
    values (new.id, trim(new.contact_email), now())
    on conflict (brand_id) do update set contact_email = excluded.contact_email, updated_at = now();
  end if;
  new.contact_email := null;
  return new;
end;
$$;
create or replace function public.move_retailer_contact_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if nullif(trim(new.contact_email), '') is not null then
    insert into public.retailer_contacts (retailer_id, contact_email, updated_at)
    values (new.id, trim(new.contact_email), now())
    on conflict (retailer_id) do update set contact_email = excluded.contact_email, updated_at = now();
  end if;
  new.contact_email := null;
  return new;
end;
$$;
revoke execute on function public.move_brand_contact_email() from public, anon, authenticated;
revoke execute on function public.move_retailer_contact_email() from public, anon, authenticated;

drop trigger if exists move_brand_contact_email on public.brands;
create trigger move_brand_contact_email before insert or update on public.brands
  for each row execute function public.move_brand_contact_email();
drop trigger if exists move_retailer_contact_email on public.retailers;
create trigger move_retailer_contact_email before insert or update on public.retailers
  for each row execute function public.move_retailer_contact_email();

-- Contact functions: owner only ----------------------------------------------
create or replace function public.get_brand_contact_info(brand_id_param uuid)
returns table(contact_email text, owner_user_id uuid)
language plpgsql security definer set search_path to 'public' as $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access contact information';
  END IF;
  PERFORM public.log_user_data_access('GET_BRAND_CONTACT', 'brands', brand_id_param);
  RETURN QUERY
  SELECT c.contact_email, b.owner_user_id
  FROM public.brands b LEFT JOIN public.brand_contacts c ON c.brand_id = b.id
  WHERE b.id = brand_id_param AND b.owner_user_id = auth.uid();
END;
$function$;

create or replace function public.get_brand_contact_secure(brand_id_param uuid)
returns table(contact_email text, owner_user_id uuid)
language plpgsql security definer set search_path to 'public' as $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access contact information';
  END IF;
  PERFORM public.log_user_data_access_enhanced('GET_BRAND_CONTACT_SECURE', 'brands',
    brand_id_param, jsonb_build_object('contact_access_requested', true, 'brand_id', brand_id_param));
  RETURN QUERY
  SELECT c.contact_email, b.owner_user_id
  FROM public.brands b LEFT JOIN public.brand_contacts c ON c.brand_id = b.id
  WHERE b.id = brand_id_param AND b.owner_user_id = auth.uid();
END;
$function$;

create or replace function public.get_retailer_contact_info(retailer_id_param uuid)
returns table(contact_email text, owner_user_id uuid)
language plpgsql security definer set search_path to 'public' as $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access contact information';
  END IF;
  PERFORM public.log_user_data_access('GET_RETAILER_CONTACT', 'retailers', retailer_id_param);
  RETURN QUERY
  SELECT c.contact_email, r.owner_user_id
  FROM public.retailers r LEFT JOIN public.retailer_contacts c ON c.retailer_id = r.id
  WHERE r.id = retailer_id_param AND r.owner_user_id = auth.uid();
END;
$function$;

create or replace function public.get_retailer_contact_info_secure(retailer_id_param uuid)
returns table(contact_email text, owner_user_id uuid)
language plpgsql security definer set search_path to 'public' as $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access contact information';
  END IF;
  PERFORM public.log_user_data_access_enhanced('GET_RETAILER_CONTACT_SECURE', 'retailers',
    retailer_id_param, jsonb_build_object('contact_access_requested', true, 'retailer_id', retailer_id_param));
  RETURN QUERY
  SELECT c.contact_email, r.owner_user_id
  FROM public.retailers r LEFT JOIN public.retailer_contacts c ON c.retailer_id = r.id
  WHERE r.id = retailer_id_param AND r.owner_user_id = auth.uid();
END;
$function$;

create or replace function public.get_retailer_contact_secure(retailer_id_param uuid)
returns table(contact_email text, owner_user_id uuid)
language plpgsql security definer set search_path to 'public' as $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access contact information';
  END IF;
  PERFORM public.log_user_data_access_enhanced('GET_RETAILER_CONTACT_SECURE', 'retailers',
    retailer_id_param, jsonb_build_object('contact_access_requested', true, 'retailer_id', retailer_id_param));
  RETURN QUERY
  SELECT c.contact_email, r.owner_user_id
  FROM public.retailers r LEFT JOIN public.retailer_contacts c ON c.retailer_id = r.id
  WHERE r.id = retailer_id_param AND r.owner_user_id = auth.uid();
END;
$function$;

revoke execute on function public.get_brand_contact_info(uuid), public.get_brand_contact_secure(uuid),
  public.get_retailer_contact_info(uuid), public.get_retailer_contact_info_secure(uuid),
  public.get_retailer_contact_secure(uuid) from public, anon;
grant execute on function public.get_brand_contact_info(uuid), public.get_brand_contact_secure(uuid),
  public.get_retailer_contact_info(uuid), public.get_retailer_contact_info_secure(uuid),
  public.get_retailer_contact_secure(uuid) to authenticated, service_role;

commit;
