-- Update remaining external products with gender information
UPDATE products 
SET gender = infer_gender_from_text(title || ' ' || COALESCE(description, ''))
WHERE gender IS NULL 
  AND is_external = true
  AND status = 'active';