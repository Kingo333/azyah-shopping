-- Fix function search path security warning by setting explicit search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role text;
  user_name text;
  brand_slug text;
  retailer_slug text;
BEGIN
  -- Extract role from metadata, default to 'shopper'
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'shopper');
  
  -- Extract name from metadata
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );
  
  -- Always create a user profile record
  INSERT INTO public.users (
    id,
    email,
    name,
    role,
    provider,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    user_name,
    user_role::user_role,
    'email',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    updated_at = NOW();
  
  -- Create brand record if user role is 'brand'
  IF user_role = 'brand' THEN
    brand_slug := lower(user_name)
      || '-' || lower(substr(md5(random()::text), 1, 8));
    
    -- Clean up slug
    brand_slug := regexp_replace(brand_slug, '[^a-z0-9-]', '-', 'g');
    brand_slug := regexp_replace(brand_slug, '-+', '-', 'g');
    brand_slug := trim(both '-' from brand_slug);
    
    INSERT INTO public.brands (
      owner_user_id,
      name,
      slug,
      contact_email,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      user_name,
      brand_slug,
      NEW.email,
      NOW(),
      NOW()
    )
    ON CONFLICT (owner_user_id) DO NOTHING;
  END IF;
  
  -- Create retailer record if user role is 'retailer'
  IF user_role = 'retailer' THEN
    retailer_slug := lower(user_name)
      || '-' || lower(substr(md5(random()::text), 1, 8));
    
    -- Clean up slug
    retailer_slug := regexp_replace(retailer_slug, '[^a-z0-9-]', '-', 'g');
    retailer_slug := regexp_replace(retailer_slug, '-+', '-', 'g');
    retailer_slug := trim(both '-' from retailer_slug);
    
    INSERT INTO public.retailers (
      owner_user_id,
      name,
      slug,
      contact_email,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      user_name,
      retailer_slug,
      NEW.email,
      NOW(),
      NOW()
    )
    ON CONFLICT (owner_user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block user creation
    RAISE LOG 'Error in handle_new_user trigger: % %', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;