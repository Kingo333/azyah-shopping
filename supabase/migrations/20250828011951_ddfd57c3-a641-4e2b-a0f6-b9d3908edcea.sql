-- Fix the foreign key constraint name conflict 
-- Drop the foreign key constraints we just added
ALTER TABLE public.wishlist_items 
DROP CONSTRAINT IF EXISTS fk_wishlist_items_wishlist,
DROP CONSTRAINT IF EXISTS fk_wishlist_items_product;

-- Add foreign key constraints with different names to avoid conflicts
ALTER TABLE public.wishlist_items 
ADD CONSTRAINT wishlist_items_wishlist_fkey 
FOREIGN KEY (wishlist_id) REFERENCES public.wishlists(id) ON DELETE CASCADE;

ALTER TABLE public.wishlist_items 
ADD CONSTRAINT wishlist_items_product_fkey 
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;