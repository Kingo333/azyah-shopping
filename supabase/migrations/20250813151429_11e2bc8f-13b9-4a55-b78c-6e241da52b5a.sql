-- Fix critical security vulnerability: Remove public access to sensitive user data
-- Drop the dangerous policy that allows anyone to read all user data
DROP POLICY IF EXISTS "Anyone can view public user profiles" ON public.users;

-- Create a secure public view that only exposes safe user information
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
    id,
    name,
    avatar_url,
    bio,
    country,
    website,
    created_at
FROM public.users;

-- Grant read access to the public view
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Create policy for the public view to allow anyone to read it
CREATE POLICY "Anyone can view public profiles view" 
ON public.public_profiles 
FOR SELECT 
USING (true);

-- Keep the existing policy for users to view their own complete profile
-- This policy should already exist: "Users can view their own profile"

-- Add admin policy to manage users if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND policyname = 'Admins can manage users'
    ) THEN
        CREATE POLICY "Admins can manage users" 
        ON public.users 
        FOR ALL 
        USING (
            EXISTS (
                SELECT 1 FROM public.users 
                WHERE id = auth.uid() 
                AND role = 'admin'
            )
        );
    END IF;
END $$;