-- Create RLS policies for all tables

-- Users table policies
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Anyone can view public user profiles" ON public.users
  FOR SELECT USING (true);

-- Brands table policies  
CREATE POLICY "Anyone can view active brands" ON public.brands
  FOR SELECT USING (true);

CREATE POLICY "Brand owners can manage their brands" ON public.brands
  FOR ALL USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can create brands" ON public.brands
  FOR INSERT WITH CHECK (auth.uid() = owner_user_id);

-- Retailers table policies
CREATE POLICY "Anyone can view active retailers" ON public.retailers
  FOR SELECT USING (true);

CREATE POLICY "Retailer owners can manage their retailers" ON public.retailers
  FOR ALL USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can create retailers" ON public.retailers
  FOR INSERT WITH CHECK (auth.uid() = owner_user_id);

-- Categories table policies
CREATE POLICY "Anyone can view categories" ON public.categories
  FOR SELECT USING (active = true);

CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Products table policies
CREATE POLICY "Anyone can view active products" ON public.products
  FOR SELECT USING (status = 'active');

CREATE POLICY "Brand owners can manage their products" ON public.products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.brands 
      WHERE id = products.brand_id AND owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Retailer owners can manage their products" ON public.products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.retailers 
      WHERE id = products.retailer_id AND owner_user_id = auth.uid()
    )
  );

-- Create update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at columns
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_brands_updated_at
  BEFORE UPDATE ON public.brands
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_retailers_updated_at
  BEFORE UPDATE ON public.retailers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();