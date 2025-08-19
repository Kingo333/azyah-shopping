-- Simple migration to add gender field with basic defaults
DO $$
BEGIN
  -- Check if gender column exists, add if it doesn't
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'gender') THEN
    -- Add gender column as text for now (will be converted to enum later)
    ALTER TABLE products ADD COLUMN gender text;
    
    -- Set basic gender defaults
    UPDATE products 
    SET gender = CASE
      WHEN title ILIKE '%men%' OR title ILIKE '%male%' OR title ILIKE '%boy%' THEN 'men'
      WHEN title ILIKE '%women%' OR title ILIKE '%female%' OR title ILIKE '%girl%' OR title ILIKE '%lady%' OR title ILIKE '%ladies%' THEN 'women'
      WHEN title ILIKE '%kid%' OR title ILIKE '%child%' OR title ILIKE '%baby%' THEN 'kids'
      ELSE 'unisex'
    END
    WHERE gender IS NULL;
  END IF;
END $$;