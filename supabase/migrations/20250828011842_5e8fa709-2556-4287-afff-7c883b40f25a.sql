-- Fix wishlist_items table schema for better reliability
ALTER TABLE public.wishlist_items 
ALTER COLUMN wishlist_id SET NOT NULL,
ALTER COLUMN product_id SET NOT NULL;

-- Add unique constraint to prevent duplicate wishlist items
ALTER TABLE public.wishlist_items 
ADD CONSTRAINT unique_wishlist_product UNIQUE (wishlist_id, product_id);

-- Ensure proper foreign key constraints exist
ALTER TABLE public.wishlist_items 
ADD CONSTRAINT fk_wishlist_items_wishlist 
FOREIGN KEY (wishlist_id) REFERENCES public.wishlists(id) ON DELETE CASCADE;

ALTER TABLE public.wishlist_items 
ADD CONSTRAINT fk_wishlist_items_product 
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;