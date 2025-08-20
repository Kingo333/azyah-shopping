-- Create gender enum type
CREATE TYPE gender_type AS ENUM ('men', 'women', 'unisex', 'kids');

-- Add gender column to products table (nullable for existing products)
ALTER TABLE public.products 
ADD COLUMN gender gender_type;

-- Create index for better filtering performance
CREATE INDEX idx_products_gender ON public.products(gender);

-- Update the validation function to handle gender
CREATE OR REPLACE FUNCTION public.validate_category_subcategory_gender(
    cat category_type, 
    subcat subcategory_type,
    gend gender_type DEFAULT NULL
) 
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
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