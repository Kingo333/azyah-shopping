-- Fix critical security vulnerability: Remove public access to sensitive user data
-- Drop the dangerous policy that allows anyone to read all user data
DROP POLICY IF EXISTS "Anyone can view public user profiles" ON public.users;

-- Create a secure table for public profile access
CREATE TABLE IF NOT EXISTS public.public_profiles (
    id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    name text,
    avatar_url text,
    bio text,
    country text,
    website text,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on the public profiles table
ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read public profiles
CREATE POLICY "Anyone can view public profiles" 
ON public.public_profiles 
FOR SELECT 
USING (true);

-- Create function to sync public profile data
CREATE OR REPLACE FUNCTION sync_public_profile()
RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.public_profiles (id, name, avatar_url, bio, country, website, created_at)
        VALUES (NEW.id, NEW.name, NEW.avatar_url, NEW.bio, NEW.country, NEW.website, NEW.created_at);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE public.public_profiles 
        SET 
            name = NEW.name,
            avatar_url = NEW.avatar_url,
            bio = NEW.bio,
            country = NEW.country,
            website = NEW.website
        WHERE id = NEW.id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM public.public_profiles WHERE id = OLD.id;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to keep public profiles in sync
DROP TRIGGER IF EXISTS sync_public_profile_trigger ON public.users;
CREATE TRIGGER sync_public_profile_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.users
    FOR EACH ROW EXECUTE FUNCTION sync_public_profile();

-- Populate existing public profiles
INSERT INTO public.public_profiles (id, name, avatar_url, bio, country, website, created_at)
SELECT id, name, avatar_url, bio, country, website, created_at 
FROM public.users
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    avatar_url = EXCLUDED.avatar_url,
    bio = EXCLUDED.bio,
    country = EXCLUDED.country,
    website = EXCLUDED.website;