-- Fix security warnings detected by linter

-- Fix function search path issues by updating functions without proper search_path
CREATE OR REPLACE FUNCTION public.validate_category_subcategory_gender(cat category_type, subcat subcategory_type, gend gender_type DEFAULT NULL::gender_type)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.infer_gender_from_text(text_input text)
RETURNS gender_type
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;