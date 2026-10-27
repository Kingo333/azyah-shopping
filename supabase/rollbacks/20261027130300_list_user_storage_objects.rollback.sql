-- Rollback for 20261027130300_list_user_storage_objects.sql.
-- Deploy the previous delete-account first (it falls back to its old folder
-- loop when this function is missing, so order doesn't break deletion).

drop function if exists public.list_user_storage_objects(uuid);
