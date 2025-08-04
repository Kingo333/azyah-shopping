-- Add unique constraint for swipes if it doesn't exist
-- This prevents duplicate swipes for the same user_id + product_id combination
ALTER TABLE public.swipes 
ADD CONSTRAINT unique_user_product_swipe 
UNIQUE (user_id, product_id);