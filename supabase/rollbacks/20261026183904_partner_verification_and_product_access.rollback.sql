-- ROLLBACK for 20261026183904_partner_verification_and_product_access.sql
-- Restores the previous (insecure) policies exactly as they were on
-- 2026-10-26 (copied from pg_policies). Run by hand only if needed.
-- Kept outside supabase/migrations on purpose.

begin;

-- Products
drop policy if exists products_public_read on public.products;
drop policy if exists products_brand_owner_all on public.products;
drop policy if exists products_retailer_owner_all on public.products;

create policy "Event products only visible in event context" on public.products for select to public
  using ((is_event_only = false) OR ((is_event_only = true) AND ((brand_id IN (SELECT brands.id FROM brands WHERE (brands.owner_user_id = auth.uid()))) OR (retailer_id IN (SELECT retailers.id FROM retailers WHERE (retailers.owner_user_id = auth.uid()))))));
create policy "products_secure_anonymous_block" on public.products for select to anon using (false);
create policy "products_secure_authenticated_only" on public.products for select to authenticated using (status = 'active'::product_status);
create policy "Brand owners can manage their products" on public.products for all to public
  using (EXISTS (SELECT 1 FROM brands b WHERE ((b.id = products.brand_id) AND (b.owner_user_id = auth.uid()))));
create policy "Brand owners can insert their products" on public.products for insert to public
  with check (EXISTS (SELECT 1 FROM brands b WHERE ((b.id = products.brand_id) AND (b.owner_user_id = auth.uid()))));
create policy "Brand owners can update their products" on public.products for update to public
  using (EXISTS (SELECT 1 FROM brands b WHERE ((b.id = products.brand_id) AND (b.owner_user_id = auth.uid()))))
  with check (EXISTS (SELECT 1 FROM brands b WHERE ((b.id = products.brand_id) AND (b.owner_user_id = auth.uid()))));
create policy "Brand owners can delete their products" on public.products for delete to public
  using (EXISTS (SELECT 1 FROM brands b WHERE ((b.id = products.brand_id) AND (b.owner_user_id = auth.uid()))));
create policy "Retailer owners can manage assigned products" on public.products for all to public
  using ((retailer_id IS NOT NULL) AND (EXISTS (SELECT 1 FROM retailers r WHERE ((r.id = products.retailer_id) AND (r.owner_user_id = auth.uid())))));
create policy "Retailer owners can insert their products" on public.products for insert to public
  with check (EXISTS (SELECT 1 FROM retailers r WHERE ((r.id = products.retailer_id) AND (r.owner_user_id = auth.uid()))));
create policy "Retailer owners can update their products" on public.products for update to public
  using (EXISTS (SELECT 1 FROM retailers r WHERE ((r.id = products.retailer_id) AND (r.owner_user_id = auth.uid()))))
  with check (EXISTS (SELECT 1 FROM retailers r WHERE ((r.id = products.retailer_id) AND (r.owner_user_id = auth.uid()))));
create policy "Retailer owners can delete their products" on public.products for delete to public
  using (EXISTS (SELECT 1 FROM retailers r WHERE ((r.id = products.retailer_id) AND (r.owner_user_id = auth.uid()))));

-- Brands
drop policy if exists brands_public_read on public.brands;
drop policy if exists brands_owner_insert on public.brands;
drop policy if exists brands_owner_update on public.brands;
drop policy if exists brands_owner_delete on public.brands;
create policy "Public can view limited brand info only" on public.brands for select to public using (true);
create policy "Authenticated users can create brands" on public.brands for insert to public
  with check ((auth.uid() = owner_user_id) AND (auth.uid() IS NOT NULL));
create policy "Brand owners can manage their brands" on public.brands for all to public using (auth.uid() = owner_user_id);
create policy "Brand owners full access to their brands" on public.brands for all to public
  using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

-- Retailers
drop policy if exists retailers_public_read on public.retailers;
drop policy if exists retailers_owner_insert on public.retailers;
drop policy if exists retailers_owner_update on public.retailers;
drop policy if exists retailers_owner_delete on public.retailers;
create policy "Public can view limited retailer info only" on public.retailers for select to public using (true);
create policy "Authenticated users can create retailers" on public.retailers for insert to public
  with check ((auth.uid() = owner_user_id) AND (auth.uid() IS NOT NULL));
create policy "Users can create retailers" on public.retailers for insert to public with check (auth.uid() = owner_user_id);
create policy "Retailer owners can manage their retailers" on public.retailers for all to public using (auth.uid() = owner_user_id);
create policy "Retailer owners full access to their retailers" on public.retailers for all to public
  using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

-- Verification
drop trigger if exists guard_partner_verification on public.brands;
drop trigger if exists guard_partner_verification on public.retailers;
drop function if exists public.guard_partner_verification();
alter table public.brands drop column if exists verification_status, drop column if exists verification_updated_at;
alter table public.retailers drop column if exists verification_status, drop column if exists verification_updated_at;

commit;
