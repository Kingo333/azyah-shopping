-- Backfill gender information for existing ASOS products
-- This updates the gender column based on inferring from product titles
-- without touching category classifications

-- Function to infer gender from text (same logic as transformer)
CREATE OR REPLACE FUNCTION infer_gender_from_text(text_input TEXT) 
RETURNS gender_type AS $$
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
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update products where gender is null and is_external is true
UPDATE products 
SET gender = infer_gender_from_text(title || ' ' || COALESCE(description, ''))
WHERE gender IS NULL 
  AND is_external = true
  AND status = 'active';

-- Log the update
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated gender for % external products', updated_count;
END $$;