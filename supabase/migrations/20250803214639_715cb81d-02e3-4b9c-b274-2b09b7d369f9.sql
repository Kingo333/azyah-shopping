-- Add RLS policies for the new tables

-- Swipes table policies
CREATE POLICY "Users can view their own swipes" ON public.swipes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own swipes" ON public.swipes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own swipes" ON public.swipes
  FOR UPDATE USING (auth.uid() = user_id);

-- Wishlists table policies
CREATE POLICY "Users can view their own wishlists" ON public.wishlists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public wishlists" ON public.wishlists
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can manage their own wishlists" ON public.wishlists
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can create wishlists" ON public.wishlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Wishlist items table policies
CREATE POLICY "Users can view their own wishlist items" ON public.wishlist_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.wishlists 
      WHERE id = wishlist_items.wishlist_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view public wishlist items" ON public.wishlist_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.wishlists 
      WHERE id = wishlist_items.wishlist_id AND is_public = true
    )
  );

CREATE POLICY "Users can manage their own wishlist items" ON public.wishlist_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.wishlists 
      WHERE id = wishlist_items.wishlist_id AND user_id = auth.uid()
    )
  );

-- Orders table policies
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders" ON public.orders
  FOR UPDATE USING (auth.uid() = user_id);

-- Order items table policies
CREATE POLICY "Users can view their own order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE id = order_items.order_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own order items" ON public.order_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE id = order_items.order_id AND user_id = auth.uid()
    )
  );

-- Affiliate links table policies
CREATE POLICY "Users can view their own affiliate links" ON public.affiliate_links
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own affiliate links" ON public.affiliate_links
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can create affiliate links" ON public.affiliate_links
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Events table policies (more open for analytics)
CREATE POLICY "Users can view their own events" ON public.events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can create events" ON public.events
  FOR INSERT WITH CHECK (true);

-- Cart items table policies
CREATE POLICY "Users can view their own cart items" ON public.cart_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own cart items" ON public.cart_items
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can create cart items" ON public.cart_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add triggers for updated_at columns
CREATE TRIGGER update_wishlists_updated_at
  BEFORE UPDATE ON public.wishlists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_affiliate_links_updated_at
  BEFORE UPDATE ON public.affiliate_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();