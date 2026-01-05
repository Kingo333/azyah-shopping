-- ============================================
-- STEP 1: Add username and role columns to public_profiles
-- ============================================
ALTER TABLE public.public_profiles 
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'shopper';

-- Add unique constraint on username (matching users table)
CREATE UNIQUE INDEX IF NOT EXISTS public_profiles_username_unique 
  ON public.public_profiles (username) 
  WHERE username IS NOT NULL;

-- ============================================
-- STEP 2: Backfill existing data from users table
-- ============================================
UPDATE public.public_profiles pp
SET 
  username = u.username,
  role = COALESCE(u.role::text, 'shopper')
FROM public.users u
WHERE pp.id = u.id;

-- ============================================
-- STEP 3: Update the sync_public_profile trigger function
-- ============================================
CREATE OR REPLACE FUNCTION sync_public_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.public_profiles (id, name, avatar_url, bio, country, website, username, role, created_at)
        VALUES (
          NEW.id, 
          NEW.name, 
          NEW.avatar_url, 
          NEW.bio, 
          NEW.country, 
          NEW.website, 
          NEW.username,
          COALESCE(NEW.role::text, 'shopper'),
          COALESCE(NEW.created_at, now())
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          avatar_url = EXCLUDED.avatar_url,
          bio = EXCLUDED.bio,
          country = EXCLUDED.country,
          website = EXCLUDED.website,
          username = EXCLUDED.username,
          role = EXCLUDED.role;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE public.public_profiles 
        SET 
            name = NEW.name,
            avatar_url = NEW.avatar_url,
            bio = NEW.bio,
            country = NEW.country,
            website = NEW.website,
            username = NEW.username,
            role = COALESCE(NEW.role::text, 'shopper')
        WHERE id = NEW.id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM public.public_profiles WHERE id = OLD.id;
        RETURN OLD;
    END IF;
END;
$$;

-- ============================================
-- STEP 4: Update RLS policies for broader read access
-- ============================================

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.public_profiles;
DROP POLICY IF EXISTS "Anyone can view profiles marked as public" ON public.public_profiles;
DROP POLICY IF EXISTS "authenticated_users_can_view_all_profiles" ON public.public_profiles;

-- Authenticated users can view ALL profiles (for in-app search)
CREATE POLICY "authenticated_users_can_view_all_profiles"
ON public.public_profiles FOR SELECT
TO authenticated
USING (true);

-- Anonymous users can only view profiles marked as public (for share pages)
CREATE POLICY "anon_can_view_public_profiles"
ON public.public_profiles FOR SELECT
TO anon
USING (is_public = true);

-- Keep the update policy for own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.public_profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.public_profiles;
CREATE POLICY "users_can_update_own_profile"
ON public.public_profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Allow insert for own profile (needed for trigger)
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON public.public_profiles;
CREATE POLICY "users_can_insert_own_profile"
ON public.public_profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());