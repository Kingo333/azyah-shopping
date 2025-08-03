-- Create test users for each role type
-- Note: These are test users for development purposes

-- Insert test users into the users table
INSERT INTO public.users (id, email, name, role, created_at, updated_at) VALUES
  -- Test Shopper
  ('00000000-0000-0000-0000-000000000001', 'shopper@test.com', 'Sarah Fashion', 'shopper', now(), now()),
  
  -- Test Brand Owner  
  ('00000000-0000-0000-0000-000000000002', 'brand@test.com', 'Alex Brand', 'brand', now(), now()),
  
  -- Test Retailer
  ('00000000-0000-0000-0000-000000000003', 'retailer@test.com', 'Morgan Store', 'retailer', now(), now()),
  
  -- Test Admin (bonus)
  ('00000000-0000-0000-0000-000000000004', 'admin@test.com', 'Admin User', 'admin', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Create a test brand for the brand owner
INSERT INTO public.brands (id, owner_user_id, name, slug, bio, website, created_at, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000002', 'Alex Fashion Co', 'alex-fashion-co', 'Premium fashion brand focusing on sustainable clothing', 'https://alexfashion.com', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Create a test retailer for the retailer owner
INSERT INTO public.retailers (id, owner_user_id, name, slug, bio, website, created_at, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000003', 'Morgan Fashion Store', 'morgan-fashion-store', 'Multi-brand fashion retailer with curated collections', 'https://morganstore.com', now(), now())
ON CONFLICT (id) DO NOTHING;