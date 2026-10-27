-- Globe "People" tab: real counts and lists.
--
-- STATUS: PROPOSED. Not applied. Needs owner approval. Rename to the version
-- live records when applied. Owner decision 2026-10-27: fix the People counts.
-- Tests: supabase/tests/globe_people_probes.sql (rollback mode on production).
-- Rollback: supabase/rollbacks/20261027100000_globe_people_lookups.rollback.sql
--
-- Before: the Globe read the users table directly, which privacy rules limit
-- to your own row, so counts and lists only ever showed you.
-- Now: two read-only lookups that return only what the Globe needs:
--   get_globe_people_counts()            -> country, number of people
--   get_globe_people(country_name, max)  -> id, name, username, avatar_url
-- Only shoppers, and never anyone who turned off "visible on Globe"
-- (users.preferences.visible_on_globe = false). No emails or other personal
-- fields. SECURITY DEFINER is needed to read across users; each function
-- returns only those public fields, with a fixed search_path.

begin;

create or replace function public.get_globe_people_counts()
returns table(country text, people integer)
language sql
stable
security definer
set search_path = ''
as $$
  select nullif(trim(u.country), '') as country, count(*)::integer as people
  from public.users u
  where u.role = 'shopper'::public.user_role
    and coalesce(u.preferences->>'visible_on_globe', 'true') <> 'false'
  group by 1
  order by 2 desc;
$$;

create or replace function public.get_globe_people(country_name text, max_rows integer default 20)
returns table(id uuid, name text, username text, avatar_url text)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, u.name, u.username, u.avatar_url
  from public.users u
  where u.role = 'shopper'::public.user_role
    and coalesce(u.preferences->>'visible_on_globe', 'true') <> 'false'
    and case when country_name is null then nullif(trim(u.country), '') is null
             else u.country = country_name end
  order by u.created_at desc
  limit least(greatest(coalesce(max_rows, 20), 1), 50);
$$;

revoke execute on function public.get_globe_people_counts(), public.get_globe_people(text, integer) from public;
grant execute on function public.get_globe_people_counts(), public.get_globe_people(text, integer) to anon, authenticated, service_role;

commit;
