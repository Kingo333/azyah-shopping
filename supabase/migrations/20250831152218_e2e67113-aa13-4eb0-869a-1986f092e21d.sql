-- Fix remaining function search path issues
-- Update all remaining functions to have explicit search_path

CREATE OR REPLACE FUNCTION public.get_cleanup_stats()
RETURNS TABLE(total_assets integer, assets_eligible_for_cleanup integer, total_jobs integer, jobs_eligible_for_cleanup integer, next_cleanup_estimate text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  cutoff_time TIMESTAMP WITH TIME ZONE;
BEGIN
  cutoff_time := NOW() - INTERVAL '48 hours';
  
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM ai_assets),
    (SELECT COUNT(*)::INTEGER FROM ai_assets WHERE created_at < cutoff_time),
    (SELECT COUNT(*)::INTEGER FROM ai_tryon_jobs),
    (SELECT COUNT(*)::INTEGER FROM ai_tryon_jobs WHERE created_at < cutoff_time),
    FORMAT('Next cleanup will remove records older than %s', cutoff_time);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_profile(profile_user_id uuid)
RETURNS TABLE(user_id uuid, display_name text, avatar_url text, bio text, country text, website text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log access attempt for audit purposes
  PERFORM public.log_user_data_access('VIEW_PUBLIC_PROFILE', 'public_profiles', profile_user_id);
  
  RETURN QUERY
  SELECT 
    pp.id as user_id,
    pp.name as display_name,
    pp.avatar_url,
    pp.bio,
    pp.country,
    pp.website,
    pp.created_at
  FROM public.public_profiles pp
  WHERE pp.id = profile_user_id 
  AND (pp.is_public = true OR pp.id = auth.uid());
END;
$function$;

CREATE OR REPLACE FUNCTION public.infer_gender_from_text(text_input text)
RETURNS gender_type
LANGUAGE plpgsql
IMMUTABLE
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

CREATE OR REPLACE FUNCTION public.validate_payment_access(payment_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  payment_user_id uuid;
BEGIN
  -- Get the payment owner
  SELECT user_id INTO payment_user_id 
  FROM public.payments 
  WHERE id = payment_id_param;
  
  -- Check if payment exists
  IF payment_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Validate access: owner, admin, or service role
  RETURN (
    auth.uid() = payment_user_id OR 
    public.get_current_user_role() = 'admin' OR
    auth.role() = 'service_role'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_category_subcategory(cat category_type, subcat subcategory_type)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
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