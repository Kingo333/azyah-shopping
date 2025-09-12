-- Delete user gabelaka79@gmail.com completely
DO $$
DECLARE
  target_user_id uuid := '6195faa7-91fc-4aa0-9629-c6044f71a181';
  deletion_result jsonb;
BEGIN
  -- Call the deletion function
  SELECT delete_user_completely('gabelaka79@gmail.com'::text, true) INTO deletion_result;
  
  -- Log the result
  RAISE NOTICE 'Deletion result: %', deletion_result;
  
  -- Also delete from auth.users if still exists
  DELETE FROM auth.users WHERE id = target_user_id;
  
END $$;