-- Clean up existing test data first
DELETE FROM public.brands WHERE owner_user_id IN (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003'
);

DELETE FROM public.retailers WHERE owner_user_id IN (
  '00000000-0000-0000-0000-000000000002', 
  '00000000-0000-0000-0000-000000000003'
);

DELETE FROM public.users WHERE id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004'
);

-- Create a function to safely create auth users  
CREATE OR REPLACE FUNCTION create_test_auth_user(
  user_email TEXT,
  user_password TEXT,
  user_name TEXT,
  user_role user_role
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Generate a new UUID
  new_user_id := gen_random_uuid();
  
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
    new_user_id,
    'authenticated',
    'authenticated',
    user_email,
    crypt(user_password, gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    json_build_object('name', user_name, 'role', user_role)::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );
  
  -- Insert into public.users
  INSERT INTO public.users (
    id,
    email,
    name,
    role,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    user_email,
    user_name,
    user_role,
    now(),
    now()
  );
  
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
    'Sarah Fashion',
    'shopper'::user_role
  );
  
  -- Create brand auth user
  brand_id := create_test_auth_user(
    'brand@test.com', 
    'password123',
    'Alex Brand',
    'brand'::user_role
  );
  
  -- Create retailer auth user
  retailer_id := create_test_auth_user(
    'retailer@test.com',
    'password123',
    'Morgan Store', 
    'retailer'::user_role
  );
  
  -- Create admin auth user
  admin_id := create_test_auth_user(
    'admin@test.com',
    'password123',
    'Admin User',
    'admin'::user_role
  );

  -- Create test brand for brand owner
  INSERT INTO public.brands (
    id,
    owner_user_id,
    name,
    slug,
    bio,
    website,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    brand_id,
    'Alex Fashion Co',
    'alex-fashion-co',
    'Premium fashion brand focusing on sustainable clothing',
    'https://alexfashion.com',
    now(),
    now()
  );
  
  -- Create test retailer for retailer owner
  INSERT INTO public.retailers (
    id,
    owner_user_id,
    name,
    slug,
    bio,
    website,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    retailer_id,
    'Morgan Fashion Store',
    'morgan-fashion-store',
    'Multi-brand fashion retailer with curated collections',
    'https://morganstore.com',
    now(),
    now()
  );
  
  RAISE NOTICE 'Test auth users created successfully';
END $$;

-- Clean up the function (remove it for security)
DROP FUNCTION create_test_auth_user(TEXT, TEXT, TEXT, user_role);