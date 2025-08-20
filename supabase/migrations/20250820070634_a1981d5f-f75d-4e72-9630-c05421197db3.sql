-- Temporarily disable the validation trigger to fix data issues
DROP TRIGGER IF EXISTS validate_category_subcategory_trigger ON products;

-- Update NULL subcategories with appropriate defaults
UPDATE products 
SET subcategory_slug = 'necklaces'
WHERE category_slug = 'jewelry' AND subcategory_slug IS NULL;

UPDATE products 
SET subcategory_slug = 'abayas'
WHERE category_slug = 'modestwear' AND subcategory_slug IS NULL;

-- Re-enable the validation (it will be recreated by the existing function)
CREATE TRIGGER validate_category_subcategory_trigger
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION validate_category_subcategory(NEW.category_slug, NEW.subcategory_slug);