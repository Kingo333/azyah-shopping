-- Fix RLS policies and create missing user data
-- This addresses the "Failed to fetch" errors

-- First, let's ensure the authenticated user exists in public.users
DO $$
DECLARE
    auth_user_id uuid := 'd87d60a3-75d8-43ef-b97b-ce660fbf3199';
    user_email text := 'shopper@test.com';
    user_name text := 'Sarah Fashion';
BEGIN
    -- Check if user exists in public.users, if not create them
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth_user_id) THEN
        INSERT INTO public.users (
            id, 
            email, 
            name, 
            role, 
            created_at, 
            updated_at
        ) VALUES (
            auth_user_id,
            user_email,
            user_name,
            'shopper'::user_role,
            NOW(),
            NOW()
        );
        RAISE NOTICE 'Created missing user record for %', user_email;
    END IF;
END $$;

-- Update users table RLS policies to be more permissive for authenticated users
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can create their profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Create more permissive policies for users table
CREATE POLICY "Authenticated users can view their own data" 
    ON public.users FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Authenticated users can insert their own data" 
    ON public.users FOR INSERT 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Authenticated users can update their own data" 
    ON public.users FOR UPDATE 
    USING (auth.uid() = id);

-- Ensure subscriptions table has proper RLS policies
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view their own subscriptions" 
    ON public.subscriptions FOR SELECT 
    USING (auth.uid() = user_id);

-- Fix brands table policies for brand owners
DROP POLICY IF EXISTS "Brand owners and admins only" ON public.brands;
DROP POLICY IF EXISTS "Brand owners can manage their brands" ON public.brands;
DROP POLICY IF EXISTS "Only brand owners and admins can view sensitive brand data" ON public.brands;
DROP POLICY IF EXISTS "Users can create brands" ON public.brands;
DROP POLICY IF EXISTS "authenticated_users_brand_access" ON public.brands;

-- Create simplified brand policies
CREATE POLICY "Brand owners can manage their brands" 
    ON public.brands FOR ALL 
    USING (auth.uid() = owner_user_id);

CREATE POLICY "Authenticated users can create brands" 
    ON public.brands FOR INSERT 
    WITH CHECK (auth.uid() = owner_user_id);

-- Add proper policies for wishlist_items table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wishlist_items') THEN
        DROP POLICY IF EXISTS "Users can manage their wishlist items" ON public.wishlist_items;
        CREATE POLICY "Users can manage their wishlist items" 
            ON public.wishlist_items FOR ALL 
            USING (auth.uid() = wishlist_id);
    END IF;
END $$;