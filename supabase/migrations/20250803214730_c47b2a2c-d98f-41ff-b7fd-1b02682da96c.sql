-- Insert the complete product taxonomy data as specified

INSERT INTO public.categories (slug, name, parent_id, description, sort_order) VALUES
-- Top-level categories
('clothing', 'Clothing', NULL, 'All clothing items', 1),
('footwear', 'Footwear', NULL, 'Shoes and footwear', 2),
('accessories', 'Accessories', NULL, 'Fashion accessories', 3),
('jewelry', 'Jewelry', NULL, 'Jewelry and watches', 4),
('beauty', 'Beauty', NULL, 'Beauty and cosmetics', 5),
('modestwear', 'Modest Wear', NULL, 'Modest and religious wear', 6),
('kids', 'Kids', NULL, 'Children''s items', 7),
('fragrance', 'Fragrance', NULL, 'Perfumes and fragrances', 8),
('home', 'Home & Lifestyle', NULL, 'Home and lifestyle products', 9),
('giftcards', 'Gift Cards', NULL, 'Digital and physical gift cards', 10);

-- Clothing subcategories
INSERT INTO public.categories (slug, name, parent_id, description, sort_order) VALUES
('dresses', 'Dresses', (SELECT id FROM public.categories WHERE slug = 'clothing'), 'All types of dresses', 1),
('abayas', 'Abayas', (SELECT id FROM public.categories WHERE slug = 'clothing'), 'Traditional abayas', 2),
('tops', 'Tops', (SELECT id FROM public.categories WHERE slug = 'clothing'), 'Tops and blouses', 3),
('blouses', 'Blouses', (SELECT id FROM public.categories WHERE slug = 'clothing'), 'Elegant blouses', 4),
('shirts', 'Shirts', (SELECT id FROM public.categories WHERE slug = 'clothing'), 'Casual and formal shirts', 5),
('t-shirts', 'T-Shirts', (SELECT id FROM public.categories WHERE slug = 'clothing'), 'Casual t-shirts', 6),
('sweaters', 'Sweaters', (SELECT id FROM public.categories WHERE slug = 'clothing'), 'Knitwear and sweaters', 7),
('jackets', 'Jackets', (SELECT id FROM public.categories WHERE slug = 'clothing'), 'Jackets and outerwear', 8),
('coats', 'Coats', (SELECT id FROM public.categories WHERE slug = 'clothing'), 'Winter coats', 9),
('blazers', 'Blazers', (SELECT id FROM public.categories WHERE slug = 'clothing'), 'Business blazers', 10),
('cardigans', 'Cardigans', (SELECT id FROM public.categories WHERE slug = 'clothing'), 'Cardigan sweaters', 11),
('trousers', 'Trousers', (SELECT id FROM public.categories WHERE slug = 'clothing'), 'Formal trousers', 12),
('jeans', 'Jeans', (SELECT id FROM public.categories WHERE slug = 'clothing'), 'Denim jeans', 13),
('skirts', 'Skirts', (SELECT id FROM public.categories WHERE slug = 'clothing'), 'All types of skirts', 14),
('shorts', 'Shorts', (SELECT id FROM public.categories WHERE slug = 'clothing'), 'Casual shorts', 15),
('activewear', 'Activewear', (SELECT id FROM public.categories WHERE slug = 'clothing'), 'Sports and fitness wear', 16),
('loungewear', 'Loungewear', (SELECT id FROM public.categories WHERE slug = 'clothing'), 'Comfortable loungewear', 17),
('sleepwear', 'Sleepwear', (SELECT id FROM public.categories WHERE slug = 'clothing'), 'Pajamas and nightwear', 18),
('swimwear', 'Swimwear', (SELECT id FROM public.categories WHERE slug = 'clothing'), 'Swimsuits and beachwear', 19),
('lingerie', 'Lingerie', (SELECT id FROM public.categories WHERE slug = 'clothing'), 'Intimate apparel', 20);

-- Footwear subcategories
INSERT INTO public.categories (slug, name, parent_id, description, sort_order) VALUES
('heels', 'Heels', (SELECT id FROM public.categories WHERE slug = 'footwear'), 'High heel shoes', 1),
('flats', 'Flats', (SELECT id FROM public.categories WHERE slug = 'footwear'), 'Flat shoes', 2),
('sandals', 'Sandals', (SELECT id FROM public.categories WHERE slug = 'footwear'), 'Summer sandals', 3),
('sneakers', 'Sneakers', (SELECT id FROM public.categories WHERE slug = 'footwear'), 'Athletic sneakers', 4),
('boots', 'Boots', (SELECT id FROM public.categories WHERE slug = 'footwear'), 'Boots and ankle boots', 5),
('loafers', 'Loafers', (SELECT id FROM public.categories WHERE slug = 'footwear'), 'Casual loafers', 6),
('slippers', 'Slippers', (SELECT id FROM public.categories WHERE slug = 'footwear'), 'House slippers', 7);

-- Create admin user function for seeding
CREATE OR REPLACE FUNCTION public.create_admin_user()
RETURNS void AS $$
BEGIN
  -- This function will be used to create the initial admin user
  -- Should be called after authentication is set up
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';