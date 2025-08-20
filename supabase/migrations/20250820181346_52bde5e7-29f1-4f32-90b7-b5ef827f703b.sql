-- Verify and fix wishlist owner access policies
-- Ensure owners can properly view and manage their own private wishlists

-- Check current policies and ensure they allow owner access
-- Drop and recreate the policies to be explicit about owner access

-- Wishlists table - ensure owners have full access to their own wishlists
DROP POLICY IF EXISTS "Users can manage their own wishlists" ON public.wishlists;

CREATE POLICY "Wishlist owners can manage their own wishlists" 
ON public.wishlists 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Also add explicit SELECT policy for clarity
CREATE POLICY "Wishlist owners can view their own wishlists" 
ON public.wishlists 
FOR SELECT 
USING (auth.uid() = user_id);

-- Wishlist items table - ensure owners can access items in their wishlists
DROP POLICY IF EXISTS "Users can manage items in their own wishlists" ON public.wishlist_items;

CREATE POLICY "Wishlist owners can manage items in their wishlists" 
ON public.wishlist_items 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.wishlists 
  WHERE wishlists.id = wishlist_items.wishlist_id 
  AND wishlists.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.wishlists 
  WHERE wishlists.id = wishlist_items.wishlist_id 
  AND wishlists.user_id = auth.uid()
));

-- Also add explicit SELECT policy for wishlist items
CREATE POLICY "Wishlist owners can view items in their wishlists" 
ON public.wishlist_items 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.wishlists 
  WHERE wishlists.id = wishlist_items.wishlist_id 
  AND wishlists.user_id = auth.uid()
));