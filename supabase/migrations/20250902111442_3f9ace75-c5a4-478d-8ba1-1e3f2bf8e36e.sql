-- Fix remaining function search path warnings
-- ================================================

-- Fix any functions that don't have explicit search_path set
-- These functions were flagged by the linter for mutable search path

-- Update update_looks_updated_at function
CREATE OR REPLACE FUNCTION public.update_looks_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Update update_subscriptions_updated_at function
CREATE OR REPLACE FUNCTION public.update_subscriptions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix any other trigger functions that might be missing explicit search_path
CREATE OR REPLACE FUNCTION public.sync_public_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- Fix track_collab_status_change function
CREATE OR REPLACE FUNCTION public.track_collab_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.collab_status_history (collab_id, old_status, new_status, changed_by)
        VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
    END IF;
    RETURN NEW;
END;
$$;

-- Ensure all critical security functions have explicit search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Determine provider from raw_app_meta_data, not app_metadata
  DECLARE
    user_provider TEXT := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');
    user_provider_id TEXT := CASE 
      WHEN user_provider = 'google' THEN NEW.raw_user_meta_data->>'provider_id'
      ELSE NULL 
    END;
  BEGIN
    INSERT INTO public.users (
      id, 
      email, 
      name, 
      role, 
      provider,
      provider_id,
      avatar_url,
      created_at, 
      updated_at
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(
        NEW.raw_user_meta_data->>'name', 
        NEW.raw_user_meta_data->>'full_name',
        split_part(NEW.email, '@', 1)
      ),
      -- Use the role from signup metadata, default to 'shopper' if not provided
      COALESCE(
        (NEW.raw_user_meta_data->>'role')::user_role,
        'shopper'::user_role
      ),
      user_provider,
      user_provider_id,
      NEW.raw_user_meta_data->>'avatar_url',
      NOW(),
      NOW()
    );
    RETURN NEW;
  END;
END;
$$;