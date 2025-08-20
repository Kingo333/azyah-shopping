-- Fix security issues by setting proper search_path for functions

-- Fix the update_user_taste_profile function
CREATE OR REPLACE FUNCTION public.update_user_taste_profile()
RETURNS TRIGGER AS $$
DECLARE
  profile_exists BOOLEAN;
  current_profile RECORD;
  product_data RECORD;
  weight_multiplier NUMERIC := 1.0;
  category_weight NUMERIC;
  brand_weight NUMERIC;
  price_weight NUMERIC;
BEGIN
  -- Get product data for this swipe
  SELECT 
    p.category_slug,
    p.subcategory_slug,
    p.price_cents,
    p.currency,
    p.tags,
    b.name as brand_name,
    p.attributes
  INTO product_data
  FROM products p
  LEFT JOIN brands b ON b.id = p.brand_id
  WHERE p.id = NEW.product_id;
  
  -- Calculate learning weights based on action type
  weight_multiplier := CASE NEW.action
    WHEN 'right' THEN 2.0  -- Strong positive signal
    WHEN 'up' THEN 3.0     -- Very strong positive signal (wishlist)
    WHEN 'left' THEN -1.0  -- Negative signal
    ELSE 0.5               -- Neutral/other actions
  END;
  
  -- Check if profile exists
  SELECT EXISTS(
    SELECT 1 FROM public.user_taste_profiles WHERE user_id = NEW.user_id
  ) INTO profile_exists;
  
  -- Create profile if it doesn't exist
  IF NOT profile_exists THEN
    INSERT INTO public.user_taste_profiles (
      user_id,
      category_preferences,
      brand_preferences,
      price_preferences,
      total_swipes,
      positive_swipes,
      negative_swipes
    ) VALUES (
      NEW.user_id,
      '{}',
      '{}', 
      '{}',
      0,
      0,
      0
    );
  END IF;
  
  -- Get current profile
  SELECT * INTO current_profile 
  FROM public.user_taste_profiles 
  WHERE user_id = NEW.user_id;
  
  -- Calculate preference weights
  category_weight := COALESCE(
    (current_profile.category_preferences->product_data.category_slug::text)::numeric, 
    0
  ) + (weight_multiplier * NEW.learning_weight);
  
  brand_weight := COALESCE(
    (current_profile.brand_preferences->product_data.brand_name)::numeric,
    0
  ) + (weight_multiplier * NEW.learning_weight);
  
  price_weight := COALESCE(
    (current_profile.price_preferences->(
      CASE 
        WHEN product_data.price_cents < 5000 THEN 'budget'
        WHEN product_data.price_cents < 20000 THEN 'mid_range'
        ELSE 'premium'
      END
    ))::numeric,
    0
  ) + (weight_multiplier * NEW.learning_weight);
  
  -- Update the profile with new preferences
  UPDATE public.user_taste_profiles
  SET 
    category_preferences = jsonb_set(
      category_preferences,
      ARRAY[product_data.category_slug::text],
      to_jsonb(category_weight)
    ),
    brand_preferences = CASE 
      WHEN product_data.brand_name IS NOT NULL THEN
        jsonb_set(
          brand_preferences,
          ARRAY[product_data.brand_name],
          to_jsonb(brand_weight)
        )
      ELSE brand_preferences
    END,
    price_preferences = jsonb_set(
      price_preferences,
      ARRAY[CASE 
        WHEN product_data.price_cents < 5000 THEN 'budget'
        WHEN product_data.price_cents < 20000 THEN 'mid_range'
        ELSE 'premium'
      END],
      to_jsonb(price_weight)
    ),
    total_swipes = total_swipes + 1,
    positive_swipes = positive_swipes + CASE WHEN NEW.action IN ('right', 'up') THEN 1 ELSE 0 END,
    negative_swipes = negative_swipes + CASE WHEN NEW.action = 'left' THEN 1 ELSE 0 END,
    preference_confidence = LEAST(1.0, (total_swipes + 1) / 100.0),
    last_updated_at = now()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public';

-- Fix the get_personalized_product_scores function
CREATE OR REPLACE FUNCTION public.get_personalized_product_scores(target_user_id uuid, product_ids uuid[])
RETURNS TABLE(
  product_id uuid,
  personalization_score numeric,
  category_score numeric,
  brand_score numeric,
  price_score numeric
) AS $$
DECLARE
  user_profile RECORD;
BEGIN
  -- Get user's taste profile
  SELECT * INTO user_profile
  FROM public.user_taste_profiles
  WHERE user_id = target_user_id;
  
  -- If no profile exists, return neutral scores
  IF user_profile IS NULL THEN
    RETURN QUERY
    SELECT 
      p.id as product_id,
      0.5::numeric as personalization_score,
      0.5::numeric as category_score,
      0.5::numeric as brand_score,
      0.5::numeric as price_score
    FROM products p
    WHERE p.id = ANY(product_ids);
    RETURN;
  END IF;
  
  -- Calculate personalized scores for each product
  RETURN QUERY
  SELECT 
    p.id as product_id,
    GREATEST(0.0, LEAST(1.0, 
      -- Weighted combination of all preference scores
      (COALESCE((user_profile.category_preferences->p.category_slug::text)::numeric, 0) * 0.4 +
       COALESCE((user_profile.brand_preferences->b.name)::numeric, 0) * 0.3 +
       COALESCE((user_profile.price_preferences->(
         CASE 
           WHEN p.price_cents < 5000 THEN 'budget'
           WHEN p.price_cents < 20000 THEN 'mid_range'
           ELSE 'premium'
         END
       ))::numeric, 0) * 0.2 +
       0.1) -- Base score for exploration
    )) as personalization_score,
    COALESCE((user_profile.category_preferences->p.category_slug::text)::numeric, 0) as category_score,
    COALESCE((user_profile.brand_preferences->b.name)::numeric, 0) as brand_score,
    COALESCE((user_profile.price_preferences->(
      CASE 
        WHEN p.price_cents < 5000 THEN 'budget'
        WHEN p.price_cents < 20000 THEN 'mid_range'
        ELSE 'premium'
      END
    ))::numeric, 0) as price_score
  FROM products p
  LEFT JOIN brands b ON b.id = p.brand_id
  WHERE p.id = ANY(product_ids)
    AND p.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public';