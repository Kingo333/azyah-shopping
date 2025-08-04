-- First, let's create the category enums
DO $$ BEGIN
    CREATE TYPE category_type AS ENUM (
        'clothing', 'footwear', 'accessories', 'jewelry', 'beauty', 
        'modestwear', 'kids', 'fragrance', 'home', 'giftcards'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE subcategory_type AS ENUM (
        -- clothing
        'dresses', 'abayas', 'tops', 'blouses', 'shirts', 't-shirts', 'sweaters', 
        'jackets', 'coats', 'blazers', 'cardigans', 'trousers', 'jeans', 'skirts', 
        'shorts', 'activewear', 'loungewear', 'sleepwear', 'swimwear', 'lingerie',
        -- footwear
        'heels', 'flats', 'sandals', 'sneakers', 'boots', 'loafers', 'slippers',
        -- accessories
        'handbags', 'clutches', 'totes', 'backpacks', 'wallets', 'belts', 'scarves', 
        'hats', 'sunglasses', 'watches', 'jewelry',
        -- jewelry
        'necklaces', 'earrings', 'bracelets', 'rings', 'anklets', 'brooches',
        -- beauty
        'perfume', 'eau-de-toilette', 'eau-de-parfum', 'skincare', 'makeup', 'nailcare', 'haircare',
        -- modestwear
        'hijabs', 'niqabs', 'jilbabs', 'kaftans',
        -- kids
        'baby clothing', 'girls clothing', 'boys clothing', 'kids footwear', 'kids accessories',
        -- fragrance
        'oriental', 'floral', 'woody', 'citrus', 'gourmand', 'oud',
        -- home
        'scented candles', 'diffusers', 'room sprays', 'fashion books',
        -- giftcards
        'digital gift card', 'physical voucher'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update the user_role enum to remove role switching capability
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';

-- Modify products table to use the new category system
ALTER TABLE products 
DROP CONSTRAINT IF EXISTS products_category_subcategory_check;

ALTER TABLE products 
ALTER COLUMN category_slug TYPE category_type USING category_slug::category_type;

ALTER TABLE products 
ALTER COLUMN subcategory_slug TYPE subcategory_type USING subcategory_slug::subcategory_type;

-- Create a function to validate category-subcategory relationships
CREATE OR REPLACE FUNCTION validate_category_subcategory(cat category_type, subcat subcategory_type)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN CASE cat
        WHEN 'clothing' THEN subcat IN ('dresses', 'abayas', 'tops', 'blouses', 'shirts', 't-shirts', 'sweaters', 'jackets', 'coats', 'blazers', 'cardigans', 'trousers', 'jeans', 'skirts', 'shorts', 'activewear', 'loungewear', 'sleepwear', 'swimwear', 'lingerie')
        WHEN 'footwear' THEN subcat IN ('heels', 'flats', 'sandals', 'sneakers', 'boots', 'loafers', 'slippers')
        WHEN 'accessories' THEN subcat IN ('handbags', 'clutches', 'totes', 'backpacks', 'wallets', 'belts', 'scarves', 'hats', 'sunglasses', 'watches', 'jewelry')
        WHEN 'jewelry' THEN subcat IN ('necklaces', 'earrings', 'bracelets', 'rings', 'anklets', 'brooches')
        WHEN 'beauty' THEN subcat IN ('perfume', 'eau-de-toilette', 'eau-de-parfum', 'skincare', 'makeup', 'nailcare', 'haircare')
        WHEN 'modestwear' THEN subcat IN ('abayas', 'hijabs', 'niqabs', 'jilbabs', 'kaftans')
        WHEN 'kids' THEN subcat IN ('baby clothing', 'girls clothing', 'boys clothing', 'kids footwear', 'kids accessories')
        WHEN 'fragrance' THEN subcat IN ('oriental', 'floral', 'woody', 'citrus', 'gourmand', 'oud')
        WHEN 'home' THEN subcat IN ('scented candles', 'diffusers', 'room sprays', 'fashion books')
        WHEN 'giftcards' THEN subcat IN ('digital gift card', 'physical voucher')
        ELSE FALSE
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add constraint to validate category-subcategory relationships
ALTER TABLE products 
ADD CONSTRAINT products_category_subcategory_check 
CHECK (subcategory_slug IS NULL OR validate_category_subcategory(category_slug, subcategory_slug));

-- Create tables for social features
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS post_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS post_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE(post_id, product_id)
);

CREATE TABLE IF NOT EXISTS post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- Enable RLS on new tables
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- RLS policies for posts
CREATE POLICY "Users can view all posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Users can create their own posts" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own posts" ON posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own posts" ON posts FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for post_images
CREATE POLICY "Users can view all post images" ON post_images FOR SELECT USING (true);
CREATE POLICY "Users can manage images for their posts" ON post_images FOR ALL USING (
    EXISTS (SELECT 1 FROM posts WHERE posts.id = post_images.post_id AND posts.user_id = auth.uid())
);

-- RLS policies for post_products
CREATE POLICY "Users can view all post products" ON post_products FOR SELECT USING (true);
CREATE POLICY "Users can manage products for their posts" ON post_products FOR ALL USING (
    EXISTS (SELECT 1 FROM posts WHERE posts.id = post_products.post_id AND posts.user_id = auth.uid())
);

-- RLS policies for post_likes
CREATE POLICY "Users can view all post likes" ON post_likes FOR SELECT USING (true);
CREATE POLICY "Users can manage their own likes" ON post_likes FOR ALL USING (auth.uid() = user_id);

-- RLS policies for follows
CREATE POLICY "Users can view all follows" ON follows FOR SELECT USING (true);
CREATE POLICY "Users can manage their own follows" ON follows FOR ALL USING (auth.uid() = follower_id);

-- Create triggers for updated_at
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();