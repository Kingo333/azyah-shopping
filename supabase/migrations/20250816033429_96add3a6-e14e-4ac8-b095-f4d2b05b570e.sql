-- Add policy to allow reading swipe data for trending analysis
-- This allows aggregate queries for determining trending styles
CREATE POLICY "Allow reading swipes for trending analysis" 
ON public.swipes 
FOR SELECT 
USING (true);