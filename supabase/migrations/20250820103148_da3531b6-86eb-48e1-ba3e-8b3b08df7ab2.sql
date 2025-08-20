-- Fix security warning: add search_path to the infer_gender_from_text function
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
  
  -- Kids indicators
  IF text_input ~ '\y(kids?|child|children|baby|toddler|infant|junior|youth|boys?|girls?)\y' THEN
    RETURN 'kids';
  END IF;
  
  -- Women indicators
  IF text_input ~ '\y(women|woman|ladies?|lady|female|abaya|dress|skirt|heel|maternity)\y' THEN
    RETURN 'women';
  END IF;
  
  -- Men indicators  
  IF text_input ~ '\y(men|man|male|masculine|gentleman|gents?)\y' THEN
    RETURN 'men';
  END IF;
  
  -- Unisex indicators
  IF text_input ~ '\y(unisex|universal|everyone|all)\y' THEN
    RETURN 'unisex';
  END IF;
  
  RETURN NULL;
END;
$$;