-- Update the gender inference function to better detect men's products
DROP FUNCTION IF EXISTS infer_gender_from_text(TEXT);

CREATE OR REPLACE FUNCTION infer_gender_from_text(text_input TEXT) 
RETURNS gender_type 
LANGUAGE plpgsql 
IMMUTABLE
SET search_path TO 'public'
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

-- Update products where gender is null with improved inference
UPDATE products 
SET gender = infer_gender_from_text(title || ' ' || COALESCE(description, ''))
WHERE gender IS NULL 
  AND status = 'active';