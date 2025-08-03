-- Seed the categories table with the exact taxonomy from the specification
INSERT INTO public.categories (slug, name, description, sort_order, active) VALUES
-- Top-level categories
('clothing', 'Clothing', 'Fashion apparel and garments', 1, true),
('footwear', 'Footwear', 'Shoes and sandals', 2, true),
('accessories', 'Accessories', 'Fashion accessories and bags', 3, true),
('jewelry', 'Jewelry', 'Fine and fashion jewelry', 4, true),
('beauty', 'Beauty', 'Beauty and cosmetic products', 5, true),
('modestwear', 'Modest Wear', 'Modest fashion and Islamic wear', 6, true),
('kids', 'Kids', 'Children and baby fashion', 7, true),
('fragrance', 'Fragrance', 'Perfumes and scents', 8, true),
('home', 'Home & Lifestyle', 'Home decor and lifestyle products', 9, true),
('giftcards', 'Gift Cards', 'Digital and physical gift cards', 10, true)
ON CONFLICT (slug) DO NOTHING;

-- Insert subcategories for clothing
INSERT INTO public.categories (slug, name, parent_id, sort_order, active) VALUES
('dresses', 'Dresses', (SELECT id FROM categories WHERE slug = 'clothing'), 1, true),
('abayas', 'Abayas', (SELECT id FROM categories WHERE slug = 'clothing'), 2, true),
('tops', 'Tops', (SELECT id FROM categories WHERE slug = 'clothing'), 3, true),
('blouses', 'Blouses', (SELECT id FROM categories WHERE slug = 'clothing'), 4, true),
('shirts', 'Shirts', (SELECT id FROM categories WHERE slug = 'clothing'), 5, true),
('t-shirts', 'T-Shirts', (SELECT id FROM categories WHERE slug = 'clothing'), 6, true),
('sweaters', 'Sweaters', (SELECT id FROM categories WHERE slug = 'clothing'), 7, true),
('jackets', 'Jackets', (SELECT id FROM categories WHERE slug = 'clothing'), 8, true),
('coats', 'Coats', (SELECT id FROM categories WHERE slug = 'clothing'), 9, true),
('blazers', 'Blazers', (SELECT id FROM categories WHERE slug = 'clothing'), 10, true),
('cardigans', 'Cardigans', (SELECT id FROM categories WHERE slug = 'clothing'), 11, true),
('trousers', 'Trousers', (SELECT id FROM categories WHERE slug = 'clothing'), 12, true),
('jeans', 'Jeans', (SELECT id FROM categories WHERE slug = 'clothing'), 13, true),
('skirts', 'Skirts', (SELECT id FROM categories WHERE slug = 'clothing'), 14, true),
('shorts', 'Shorts', (SELECT id FROM categories WHERE slug = 'clothing'), 15, true),
('activewear', 'Activewear', (SELECT id FROM categories WHERE slug = 'clothing'), 16, true),
('loungewear', 'Loungewear', (SELECT id FROM categories WHERE slug = 'clothing'), 17, true),
('sleepwear', 'Sleepwear', (SELECT id FROM categories WHERE slug = 'clothing'), 18, true),
('swimwear', 'Swimwear', (SELECT id FROM categories WHERE slug = 'clothing'), 19, true),
('lingerie', 'Lingerie', (SELECT id FROM categories WHERE slug = 'clothing'), 20, true)
ON CONFLICT (slug) DO NOTHING;

-- Insert subcategories for footwear
INSERT INTO public.categories (slug, name, parent_id, sort_order, active) VALUES
('heels', 'Heels', (SELECT id FROM categories WHERE slug = 'footwear'), 1, true),
('flats', 'Flats', (SELECT id FROM categories WHERE slug = 'footwear'), 2, true),
('sandals', 'Sandals', (SELECT id FROM categories WHERE slug = 'footwear'), 3, true),
('sneakers', 'Sneakers', (SELECT id FROM categories WHERE slug = 'footwear'), 4, true),
('boots', 'Boots', (SELECT id FROM categories WHERE slug = 'footwear'), 5, true),
('loafers', 'Loafers', (SELECT id FROM categories WHERE slug = 'footwear'), 6, true),
('slippers', 'Slippers', (SELECT id FROM categories WHERE slug = 'footwear'), 7, true)
ON CONFLICT (slug) DO NOTHING;

-- Insert subcategories for accessories
INSERT INTO public.categories (slug, name, parent_id, sort_order, active) VALUES
('handbags', 'Handbags', (SELECT id FROM categories WHERE slug = 'accessories'), 1, true),
('clutches', 'Clutches', (SELECT id FROM categories WHERE slug = 'accessories'), 2, true),
('totes', 'Tote Bags', (SELECT id FROM categories WHERE slug = 'accessories'), 3, true),
('backpacks', 'Backpacks', (SELECT id FROM categories WHERE slug = 'accessories'), 4, true),
('wallets', 'Wallets', (SELECT id FROM categories WHERE slug = 'accessories'), 5, true),
('belts', 'Belts', (SELECT id FROM categories WHERE slug = 'accessories'), 6, true),
('scarves', 'Scarves', (SELECT id FROM categories WHERE slug = 'accessories'), 7, true),
('hats', 'Hats', (SELECT id FROM categories WHERE slug = 'accessories'), 8, true),
('sunglasses', 'Sunglasses', (SELECT id FROM categories WHERE slug = 'accessories'), 9, true),
('watches', 'Watches', (SELECT id FROM categories WHERE slug = 'accessories'), 10, true)
ON CONFLICT (slug) DO NOTHING;

-- Insert subcategories for jewelry
INSERT INTO public.categories (slug, name, parent_id, sort_order, active) VALUES
('necklaces', 'Necklaces', (SELECT id FROM categories WHERE slug = 'jewelry'), 1, true),
('earrings', 'Earrings', (SELECT id FROM categories WHERE slug = 'jewelry'), 2, true),
('bracelets', 'Bracelets', (SELECT id FROM categories WHERE slug = 'jewelry'), 3, true),
('rings', 'Rings', (SELECT id FROM categories WHERE slug = 'jewelry'), 4, true),
('anklets', 'Anklets', (SELECT id FROM categories WHERE slug = 'jewelry'), 5, true),
('brooches', 'Brooches', (SELECT id FROM categories WHERE slug = 'jewelry'), 6, true)
ON CONFLICT (slug) DO NOTHING;

-- Insert subcategories for beauty
INSERT INTO public.categories (slug, name, parent_id, sort_order, active) VALUES
('perfume', 'Perfume', (SELECT id FROM categories WHERE slug = 'beauty'), 1, true),
('eau-de-toilette', 'Eau de Toilette', (SELECT id FROM categories WHERE slug = 'beauty'), 2, true),
('eau-de-parfum', 'Eau de Parfum', (SELECT id FROM categories WHERE slug = 'beauty'), 3, true),
('skincare', 'Skincare', (SELECT id FROM categories WHERE slug = 'beauty'), 4, true),
('makeup', 'Makeup', (SELECT id FROM categories WHERE slug = 'beauty'), 5, true),
('nailcare', 'Nail Care', (SELECT id FROM categories WHERE slug = 'beauty'), 6, true),
('haircare', 'Hair Care', (SELECT id FROM categories WHERE slug = 'beauty'), 7, true)
ON CONFLICT (slug) DO NOTHING;

-- Insert subcategories for modest wear
INSERT INTO public.categories (slug, name, parent_id, sort_order, active) VALUES
('hijabs', 'Hijabs', (SELECT id FROM categories WHERE slug = 'modestwear'), 1, true),
('niqabs', 'Niqabs', (SELECT id FROM categories WHERE slug = 'modestwear'), 2, true),
('jilbabs', 'Jilbabs', (SELECT id FROM categories WHERE slug = 'modestwear'), 3, true),
('kaftans', 'Kaftans', (SELECT id FROM categories WHERE slug = 'modestwear'), 4, true)
ON CONFLICT (slug) DO NOTHING;

-- Insert subcategories for kids
INSERT INTO public.categories (slug, name, parent_id, sort_order, active) VALUES
('baby-clothing', 'Baby Clothing', (SELECT id FROM categories WHERE slug = 'kids'), 1, true),
('girls-clothing', 'Girls Clothing', (SELECT id FROM categories WHERE slug = 'kids'), 2, true),
('boys-clothing', 'Boys Clothing', (SELECT id FROM categories WHERE slug = 'kids'), 3, true),
('kids-footwear', 'Kids Footwear', (SELECT id FROM categories WHERE slug = 'kids'), 4, true),
('kids-accessories', 'Kids Accessories', (SELECT id FROM categories WHERE slug = 'kids'), 5, true)
ON CONFLICT (slug) DO NOTHING;

-- Insert subcategories for fragrance
INSERT INTO public.categories (slug, name, parent_id, sort_order, active) VALUES
('oriental', 'Oriental', (SELECT id FROM categories WHERE slug = 'fragrance'), 1, true),
('floral', 'Floral', (SELECT id FROM categories WHERE slug = 'fragrance'), 2, true),
('woody', 'Woody', (SELECT id FROM categories WHERE slug = 'fragrance'), 3, true),
('citrus', 'Citrus', (SELECT id FROM categories WHERE slug = 'fragrance'), 4, true),
('gourmand', 'Gourmand', (SELECT id FROM categories WHERE slug = 'fragrance'), 5, true),
('oud', 'Oud', (SELECT id FROM categories WHERE slug = 'fragrance'), 6, true)
ON CONFLICT (slug) DO NOTHING;

-- Insert subcategories for home & lifestyle
INSERT INTO public.categories (slug, name, parent_id, sort_order, active) VALUES
('scented-candles', 'Scented Candles', (SELECT id FROM categories WHERE slug = 'home'), 1, true),
('diffusers', 'Diffusers', (SELECT id FROM categories WHERE slug = 'home'), 2, true),
('room-sprays', 'Room Sprays', (SELECT id FROM categories WHERE slug = 'home'), 3, true),
('fashion-books', 'Fashion Books', (SELECT id FROM categories WHERE slug = 'home'), 4, true)
ON CONFLICT (slug) DO NOTHING;

-- Insert subcategories for gift cards
INSERT INTO public.categories (slug, name, parent_id, sort_order, active) VALUES
('digital-gift-card', 'Digital Gift Card', (SELECT id FROM categories WHERE slug = 'giftcards'), 1, true),
('physical-voucher', 'Physical Voucher', (SELECT id FROM categories WHERE slug = 'giftcards'), 2, true)
ON CONFLICT (slug) DO NOTHING;