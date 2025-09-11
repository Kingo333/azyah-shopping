-- Revert the RLS policy changes and user record creation
-- This undoes the changes from the previous migration

-- Remove the user record that was created
DELETE FROM public.users WHERE id = 'd87d60a3-75d8-43ef-b97b-ce660fbf3199' AND email = 'shopper@test.com';

-- Revert users table policies back to original state
DROP POLICY IF EXISTS "Authenticated users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can insert their own data" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can update their own data" ON public.users;

-- Restore original users policies (simplified versions)
CREATE POLICY "Users can view their own profile" 
    ON public.users FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can create their profile" 
    ON public.users FOR INSERT 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
    ON public.users FOR UPDATE 
    USING (auth.uid() = id);

-- Revert brands table policies
DROP POLICY IF EXISTS "Brand owners can manage their brands" ON public.brands;
DROP POLICY IF EXISTS "Authenticated users can create brands" ON public.brands;

-- Restore original brand policies
CREATE POLICY "Brand owners can manage their brands" 
    ON public.brands FOR ALL 
    USING (auth.uid() = owner_user_id);

CREATE POLICY "Authenticated users can create brands" 
    ON public.brands FOR INSERT 
    WITH CHECK (auth.uid() = owner_user_id);

-- Revert subscriptions policy if it was changed
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view their own subscriptions" 
    ON public.subscriptions FOR SELECT 
    USING (auth.uid() = user_id);

-- Remove any wishlist policies that were added
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wishlist_items') THEN
        DROP POLICY IF EXISTS "Users can manage their wishlist items" ON public.wishlist_items;
    END IF;
END $$;