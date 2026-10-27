-- Partner verification and product access.
--
-- STATUS: APPLIED to live 2026-10-26 with owner approval (version 20261026183904).
-- Post-apply probes 30/30; advisors unchanged.
-- Review: docs/redesign/PARTNER_AND_EVENTS_REVIEW.md (P1, P2, P4, P6, P8).
-- Tests:  supabase/tests/partner_products_probes.sql (on production, only in
--         rollback mode; see its header).
-- Rollback: supabase/rollbacks/20261026183904_partner_verification_and_product_access.rollback.sql
--
-- What it does:
--   1. Partner verification (owner decision: manual approval). New brands and
--      retailers start 'pending'; only the server or an admin can approve.
--      Every existing brand and retailer is approved so nothing disappears today.
--   2. Shoppers and logged-out visitors only see products that are active,
--      not event-only, and whose brand and store (if any) are approved.
--      Archived products (19 today) are no longer visible to them.
--   3. Only brand/retailer accounts (or admins) can create brand profiles;
--      only retailer accounts (or admins) can create retailer profiles.
--   4. A retailer can only write products for its own store under no brand, a
--      catalog brand with no owner (e.g. ASOS imports), or a brand it owns.
--      A brand can only attach its products to a store it owns.
--   5. Replaces the overlapping TO public policies on brands, retailers and
--      products with one explicit policy per job, TO anon/authenticated, with
--      USING and WITH CHECK.
-- Owners keep full access to their own rows (including archived and pending).

begin;

-- 1. Verification columns -----------------------------------------------------
alter table public.brands
  add column if not exists verification_status text not null default 'pending'
    check (verification_status in ('pending', 'approved', 'rejected')),
  add column if not exists verification_updated_at timestamptz;
alter table public.retailers
  add column if not exists verification_status text not null default 'pending'
    check (verification_status in ('pending', 'approved', 'rejected')),
  add column if not exists verification_updated_at timestamptz;

update public.brands set verification_status = 'approved', verification_updated_at = now();
update public.retailers set verification_status = 'approved', verification_updated_at = now();

create or replace function public.guard_partner_verification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.verification_status is distinct from 'pending' or new.verification_updated_at is not null then
      raise exception 'verification can only be set by the server' using errcode = '42501';
    end if;
    return new;
  end if;
  if new.verification_status is distinct from old.verification_status
     or new.verification_updated_at is distinct from old.verification_updated_at then
    raise exception 'verification can only be set by the server' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_partner_verification on public.brands;
create trigger guard_partner_verification before insert or update on public.brands
  for each row execute function public.guard_partner_verification();
drop trigger if exists guard_partner_verification on public.retailers;
create trigger guard_partner_verification before insert or update on public.retailers
  for each row execute function public.guard_partner_verification();

-- 2-5. Brands ------------------------------------------------------------------
drop policy if exists "Authenticated users can create brands" on public.brands;
drop policy if exists "Brand owners can manage their brands" on public.brands;
drop policy if exists "Brand owners full access to their brands" on public.brands;
drop policy if exists "Public can view limited brand info only" on public.brands;

create policy brands_public_read on public.brands
  for select to anon, authenticated using (true);
create policy brands_owner_insert on public.brands
  for insert to authenticated
  with check (
    owner_user_id = (select auth.uid())
    and exists (select 1 from public.user_roles ur
                where ur.user_id = (select auth.uid())
                  and ur.role in ('brand'::public.user_role, 'retailer'::public.user_role, 'admin'::public.user_role))
  );
create policy brands_owner_update on public.brands
  for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));
create policy brands_owner_delete on public.brands
  for delete to authenticated
  using (owner_user_id = (select auth.uid()));

-- Retailers -------------------------------------------------------------------
drop policy if exists "Authenticated users can create retailers" on public.retailers;
drop policy if exists "Users can create retailers" on public.retailers;
drop policy if exists "Retailer owners can manage their retailers" on public.retailers;
drop policy if exists "Retailer owners full access to their retailers" on public.retailers;
drop policy if exists "Public can view limited retailer info only" on public.retailers;

create policy retailers_public_read on public.retailers
  for select to anon, authenticated using (true);
create policy retailers_owner_insert on public.retailers
  for insert to authenticated
  with check (
    owner_user_id = (select auth.uid())
    and exists (select 1 from public.user_roles ur
                where ur.user_id = (select auth.uid())
                  and ur.role in ('retailer'::public.user_role, 'admin'::public.user_role))
  );
create policy retailers_owner_update on public.retailers
  for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));
create policy retailers_owner_delete on public.retailers
  for delete to authenticated
  using (owner_user_id = (select auth.uid()));

-- Products --------------------------------------------------------------------
drop policy if exists "Event products only visible in event context" on public.products;
drop policy if exists "products_secure_anonymous_block" on public.products;
drop policy if exists "products_secure_authenticated_only" on public.products;
drop policy if exists "Brand owners can manage their products" on public.products;
drop policy if exists "Brand owners can insert their products" on public.products;
drop policy if exists "Brand owners can update their products" on public.products;
drop policy if exists "Brand owners can delete their products" on public.products;
drop policy if exists "Retailer owners can manage assigned products" on public.products;
drop policy if exists "Retailer owners can insert their products" on public.products;
drop policy if exists "Retailer owners can update their products" on public.products;
drop policy if exists "Retailer owners can delete their products" on public.products;

create policy products_public_read on public.products
  for select to anon, authenticated
  using (
    status = 'active'::public.product_status
    and not coalesce(is_event_only, false)
    and (brand_id is null or exists (
          select 1 from public.brands b
          where b.id = products.brand_id and b.verification_status = 'approved'))
    and (retailer_id is null or exists (
          select 1 from public.retailers r
          where r.id = products.retailer_id and r.verification_status = 'approved'))
  );

create policy products_brand_owner_all on public.products
  for all to authenticated
  using (exists (select 1 from public.brands b
                 where b.id = products.brand_id and b.owner_user_id = (select auth.uid())))
  with check (
    exists (select 1 from public.brands b
            where b.id = products.brand_id and b.owner_user_id = (select auth.uid()))
    and (retailer_id is null or exists (
          select 1 from public.retailers r
          where r.id = products.retailer_id and r.owner_user_id = (select auth.uid())))
  );

create policy products_retailer_owner_all on public.products
  for all to authenticated
  using (retailer_id is not null and exists (
          select 1 from public.retailers r
          where r.id = products.retailer_id and r.owner_user_id = (select auth.uid())))
  with check (
    retailer_id is not null
    and exists (select 1 from public.retailers r
                where r.id = products.retailer_id and r.owner_user_id = (select auth.uid()))
    and (brand_id is null or exists (
          select 1 from public.brands b
          where b.id = products.brand_id
            and (b.owner_user_id is null or b.owner_user_id = (select auth.uid()))))
  );

commit;
