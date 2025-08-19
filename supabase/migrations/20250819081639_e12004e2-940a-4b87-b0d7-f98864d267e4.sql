-- Insert new categories into the categories table
INSERT INTO public.categories (slug, name, description, active, sort_order) 
VALUES 
  ('women', 'Women', 'Women''s fashion and accessories', true, 1),
  ('men', 'Men', 'Men''s fashion and accessories', true, 2)
ON CONFLICT (slug) DO NOTHING;

-- Update the validation function to include new categories
CREATE OR REPLACE FUNCTION public.validate_category_subcategory(cat category_type, subcat subcategory_type)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN CASE cat
        WHEN 'women' THEN subcat IN ('womens clothing', 'womens footwear', 'womens accessories')
        WHEN 'men' THEN subcat IN ('mens clothing', 'mens footwear', 'mens accessories')
        WHEN 'clothing' THEN subcat IN ('dresses', 'abayas', 'tops', 'blouses', 'shirts', 't-shirts', 'sweaters', 'jackets', 'coats', 'blazers', 'cardigans', 'trousers', 'jeans', 'skirts', 'shorts', 'activewear', 'loungewear', 'sleepwear', 'swimwear', 'lingerie')
        WHEN 'footwear' THEN subcat IN ('heels', 'flats', 'sandals', 'sneakers', 'boots', 'loafers', 'slippers')
        WHEN 'accessories' THEN subcat IN ('belts', 'scarves', 'hats', 'sunglasses', 'watches')
        WHEN 'jewelry' THEN subcat IN ('necklaces', 'earrings', 'bracelets', 'rings', 'anklets', 'brooches')
        WHEN 'beauty' THEN subcat IN ('all beauty', 'skincare', 'haircare', 'makeup', 'fragrances', 'home fragrances', 'tools & accessories')
        WHEN 'bags' THEN subcat IN ('handbags', 'clutches', 'totes', 'backpacks', 'wallets')
        WHEN 'modestwear' THEN subcat IN ('abayas', 'hijabs', 'niqabs', 'jilbabs', 'kaftans')
        WHEN 'kids' THEN subcat IN ('baby clothing', 'girls clothing', 'boys clothing', 'kids footwear', 'kids accessories')
        WHEN 'fragrance' THEN subcat IN ('oriental', 'floral', 'woody', 'citrus', 'gourmand', 'oud')
        WHEN 'home' THEN subcat IN ('scented candles', 'diffusers', 'room sprays', 'fashion books')
        WHEN 'giftcards' THEN subcat IN ('digital gift card', 'physical voucher')
        ELSE FALSE
    END;
END;
$function$;