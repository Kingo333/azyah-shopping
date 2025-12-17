-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_premium boolean NOT NULL DEFAULT false,
  plan_type text NULL CHECK (plan_type IS NULL OR plan_type IN ('monthly', 'yearly')),
  premium_expires_at timestamptz NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies with proper WITH CHECK
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_profiles_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER profiles_updated_at_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_profiles_updated_at();

-- 5. Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- 6. Backfill: Create profiles for ALL existing auth.users
INSERT INTO public.profiles (id)
SELECT id FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 7. Copy premium data from users table to profiles (for users who have premium data)
UPDATE public.profiles p
SET 
  is_premium = COALESCE(u.is_premium, false),
  plan_type = u.plan_type,
  premium_expires_at = u.premium_expires_at
FROM public.users u
WHERE u.id = p.id;

-- 8. Add index for analytics/admin queries on is_premium
CREATE INDEX IF NOT EXISTS profiles_is_premium_idx ON public.profiles (is_premium);