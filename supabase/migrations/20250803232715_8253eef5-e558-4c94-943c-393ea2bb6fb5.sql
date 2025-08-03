-- Create auth users for testing with password: password123
-- Note: This is for development/testing only

-- First, let's create a function to safely create auth users
CREATE OR REPLACE FUNCTION create_test_auth_user(
  user_email TEXT,
  user_password TEXT,
  user_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Insert into auth.users (this is the actual auth table)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    user_email,
    crypt(user_password, gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    user_metadata,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ) RETURNING id INTO new_user_id;
  
  RETURN new_user_id;
END;
$$;

-- Create test auth users
DO $$
DECLARE
  shopper_id uuid;
  brand_id uuid;
  retailer_id uuid;
  admin_id uuid;
BEGIN
  -- Create shopper auth user
  shopper_id := create_test_auth_user(
    'shopper@test.com',
    'password123',
    '{"name": "Sarah Fashion", "role": "shopper"}'::jsonb
  );
  
  -- Create brand auth user
  brand_id := create_test_auth_user(
    'brand@test.com', 
    'password123',
    '{"name": "Alex Brand", "role": "brand"}'::jsonb
  );
  
  -- Create retailer auth user
  retailer_id := create_test_auth_user(
    'retailer@test.com',
    'password123', 
    '{"name": "Morgan Store", "role": "retailer"}'::jsonb
  );
  
  -- Create admin auth user
  admin_id := create_test_auth_user(
    'admin@test.com',
    'password123',
    '{"name": "Admin User", "role": "admin"}'::jsonb
  );

  -- Update public.users table with the correct auth user IDs
  UPDATE public.users SET id = shopper_id WHERE email = 'shopper@test.com';
  UPDATE public.users SET id = brand_id WHERE email = 'brand@test.com';  
  UPDATE public.users SET id = retailer_id WHERE email = 'retailer@test.com';
  UPDATE public.users SET id = admin_id WHERE email = 'admin@test.com';
  
  -- Update brand and retailer ownership
  UPDATE public.brands SET owner_user_id = brand_id WHERE owner_user_id = '00000000-0000-0000-0000-000000000002';
  UPDATE public.retailers SET owner_user_id = retailer_id WHERE owner_user_id = '00000000-0000-0000-0000-000000000003';
  
  RAISE NOTICE 'Test auth users created successfully';
END $$;

-- Clean up the function (remove it for security)
DROP FUNCTION create_test_auth_user(TEXT, TEXT, JSONB);