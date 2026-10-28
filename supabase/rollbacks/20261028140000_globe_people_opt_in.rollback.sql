-- ROLLBACK for 20261028140000_globe_people_opt_in.sql: back to opt-out
-- (shown unless preferences.visible_on_globe = false), as in 20261027080253.
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
