-- Closet and outfit folders: nobody can list everyone's files.
-- Design: docs/superpowers/specs/2026-10-27-private-photos-design.md (step 4).
-- The folders stay public, so every saved link keeps opening: Live Cam
-- "My Closet", starter items, public outfits, shared items and share previews
-- are unaffected. Who sees which closet item or outfit is still decided by the
-- database rules (owner, public reuse, public outfit, starter items).
-- Owners keep their own read rules (wardrobe-items: existing; saved-outfits:
-- added in 20261027125651).
-- Probes: supabase/tests/closet_listing_probes.sql.

drop policy if exists "Public can view wardrobe items" on storage.objects;
drop policy if exists "Public can view outfit images" on storage.objects;
