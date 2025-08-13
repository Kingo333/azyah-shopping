-- Remove unnecessary sensitive fields from users table since we redirect to external stores
-- Keep only essential fields for user profile and authentication

-- Remove phone number field
ALTER TABLE public.users DROP COLUMN IF EXISTS phone CASCADE;

-- Remove shipping address field 
ALTER TABLE public.users DROP COLUMN IF EXISTS shipping_address CASCADE;

-- Remove billing address field
ALTER TABLE public.users DROP COLUMN IF EXISTS billing_address CASCADE;