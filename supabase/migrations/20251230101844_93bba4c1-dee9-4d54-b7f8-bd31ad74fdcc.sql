-- Drop the broken trigger that references non-existent closets table
DROP TRIGGER IF EXISTS create_default_closet_trigger ON public.users;

-- Drop the orphaned function
DROP FUNCTION IF EXISTS create_default_closet_for_user();