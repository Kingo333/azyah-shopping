-- Fix NULL subcategories and add safe deletion function
UPDATE products 
SET subcategory_slug = 'necklaces'::subcategory_type 
WHERE category_slug = 'jewelry' AND subcategory_slug IS NULL;

UPDATE products 
SET subcategory_slug = 'abayas'::subcategory_type 
WHERE category_slug = 'modestwear' AND subcategory_slug IS NULL;

-- Create a safe product deletion function that handles all related records
CREATE OR REPLACE FUNCTION delete_product_safely(product_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    product_exists boolean := false;
BEGIN
    -- Check if product exists and user has permission
    SELECT EXISTS(
        SELECT 1 FROM products p
        LEFT JOIN brands b ON b.id = p.brand_id
        LEFT JOIN retailers r ON r.id = p.retailer_id
        WHERE p.id = product_uuid
        AND (b.owner_user_id = auth.uid() OR r.owner_user_id = auth.uid())
    ) INTO product_exists;
    
    IF NOT product_exists THEN
        RETURN false;
    END IF;
    
    -- Delete related records in proper order to avoid foreign key issues
    DELETE FROM cart_items WHERE product_id = product_uuid;
    DELETE FROM closet_items WHERE product_id = product_uuid;
    DELETE FROM likes WHERE product_id = product_uuid;
    DELETE FROM swipes WHERE product_id = product_uuid;
    DELETE FROM post_products WHERE product_id = product_uuid;
    
    -- Finally delete the product
    DELETE FROM products WHERE id = product_uuid;
    
    RETURN true;
END;
$$;