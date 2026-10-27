-- ROLLBACK for 20261027100000_globe_people_lookups.sql
begin;
drop function if exists public.get_globe_people(text, integer);
drop function if exists public.get_globe_people_counts();
commit;
