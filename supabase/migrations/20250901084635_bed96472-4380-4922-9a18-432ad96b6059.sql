-- CRITICAL SECURITY FIXES - Updated
-- Fix 1: Secure Brand/Retailer Contact Data Exposure
-- =====================================================

-- Drop existing views first to avoid conflicts
DROP VIEW IF EXISTS public.brands_public CASCADE;
DROP VIEW IF EXISTS public.retailers_public CASCADE;

-- Drop existing permissive policies that expose contact data
DROP POLICY IF EXISTS "Authenticated users can view basic brand info only" ON public.brands;
DROP POLICY IF EXISTS "Authenticated users can view basic retailer info only" ON public.retailers;
DROP POLICY IF EXISTS "Anonymous users cannot access brands table directly" ON public.brands;
DROP POLICY IF EXISTS "Anonymous users cannot access retailers table directly" ON public.retailers;

-- Create restrictive policies for brands table
CREATE POLICY "Authenticated users can view brand contact details" 
ON public.brands 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() = owner_user_id OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  )
);

-- Create restrictive policies for retailers table  
CREATE POLICY "Authenticated users can view retailer contact details" 
ON public.retailers 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() = owner_user_id OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  )
);

-- Create public views with safe fields only (no contact_email, no owner_user_id)
CREATE VIEW public.brands_public AS 
SELECT 
  id,
  name,
  slug,
  logo_url,
  bio,
  website,
  socials,
  shipping_regions,
  cover_image_url,
  created_at,
  updated_at
FROM public.brands;

CREATE VIEW public.retailers_public AS 
SELECT 
  id,
  name,
  slug,
  logo_url,
  bio,
  website,
  socials,
  shipping_regions,
  cover_image_url,
  created_at,
  updated_at
FROM public.retailers;

-- Fix 2: Database Function Search Path Hardening
-- ==============================================

-- Update functions that don't have explicit search path set
CREATE OR REPLACE FUNCTION public.update_looks_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_category_subcategory_gender(cat category_type, subcat subcategory_type, gend gender_type DEFAULT NULL::gender_type)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Validate category-subcategory combination (existing logic)
    IF NOT validate_category_subcategory(cat, subcat) THEN
        RETURN FALSE;
    END IF;
    
    -- Gender is optional, so NULL is always valid
    IF gend IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- All gender values are valid for all categories
    RETURN gend IN ('men', 'women', 'unisex', 'kids');
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_category_subcategory(cat category_type, subcat subcategory_type)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    RETURN CASE cat
        WHEN 'clothing' THEN subcat IN ('dresses', 'abayas', 'tops', 'blouses', 'shirts', 't-shirts', 'sweaters', 'jackets', 'coats', 'blazers', 'cardigans', 'trousers', 'jeans', 'skirts', 'shorts', 'activewear', 'loungewear', 'sleepwear', 'swimwear', 'lingerie')
        WHEN 'footwear' THEN subcat IN ('heels', 'flats', 'sandals', 'sneakers', 'boots', 'loafers', 'slippers')
        WHEN 'accessories' THEN subcat IN ('belts', 'scarves', 'hats', 'sunglasses', 'watches')
        WHEN 'jewelry' THEN subcat IN ('necklaces', 'earrings', 'bracelets', 'rings', 'anklets', 'brooches')
        WHEN 'beauty' THEN subcat IN ('skincare', 'haircare', 'makeup', 'fragrances', 'home fragrances', 'tools & accessories')
        WHEN 'bags' THEN subcat IN ('handbags', 'clutches', 'totes', 'backpacks', 'wallets')
        WHEN 'modestwear' THEN subcat IN ('abayas', 'hijabs', 'niqabs', 'jilbabs', 'kaftans')
        WHEN 'kids' THEN subcat IN ('baby clothing', 'girls clothing', 'boys clothing', 'kids footwear', 'kids accessories')
        WHEN 'fragrance' THEN subcat IN ('oriental', 'floral', 'woody', 'citrus', 'gourmand', 'oud')
        WHEN 'home' THEN subcat IN ('scented candles', 'diffusers', 'room sprays', 'fashion books')
        WHEN 'giftcards' THEN subcat IN ('digital gift card', 'physical voucher')
        ELSE FALSE
    END;
END;
$function$;

CREATE OR REPLACE FUNCTION public.infer_gender_from_text(text_input text)
RETURNS gender_type
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Convert to lowercase for matching
  text_input := LOWER(text_input);
  
  -- Kids indicators (check first as they're most specific)
  IF text_input ~ '\y(kids?|child|children|baby|toddler|infant|junior|youth|boys?|girls?)\y' THEN
    RETURN 'kids';
  END IF;
  
  -- Men indicators - expanded to catch more men's products
  IF text_input ~ '\y(men|man|male|masculine|gentleman|gents?|topman|menswear)\y' THEN
    RETURN 'men';
  END IF;
  
  -- Women indicators  
  IF text_input ~ '\y(women|woman|ladies?|lady|female|abaya|dress|skirt|heel|maternity|topshop)\y' THEN
    RETURN 'women';
  END IF;
  
  -- Unisex indicators
  IF text_input ~ '\y(unisex|universal|everyone|all)\y' THEN
    RETURN 'unisex';
  END IF;
  
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.tier_from_price_aed(aed_price numeric)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE 
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  drugstore_max numeric := COALESCE(current_setting('app.price_tier_drugstore_max', true)::numeric, 60);
  mid_max numeric := COALESCE(current_setting('app.price_tier_mid_max', true)::numeric, 180);
BEGIN
  IF aed_price <= drugstore_max THEN
    RETURN 'drugstore';
  ELSIF aed_price <= mid_max THEN
    RETURN 'mid';
  ELSE
    RETURN 'premium';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.embed_query(query_text text)
RETURNS numeric[]
LANGUAGE plpgsql
IMMUTABLE 
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Placeholder for embedding function
  -- In real implementation, use OpenAI embeddings API
  RETURN array_fill(0.0, ARRAY[1536]);
END;
$function$;