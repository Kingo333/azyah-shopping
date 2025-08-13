-- Remove sensitive financial data tables since the business model redirects to external stores
-- The app only needs to track affiliate conversion counts, not process actual orders

-- Drop the order_items table first (has foreign key dependency)
DROP TABLE IF EXISTS public.order_items CASCADE;

-- Drop the orders table with sensitive financial data
DROP TABLE IF EXISTS public.orders CASCADE;

-- The affiliate_links table already has an 'orders' column for tracking conversions
-- This is sufficient for affiliate tracking without storing sensitive payment data