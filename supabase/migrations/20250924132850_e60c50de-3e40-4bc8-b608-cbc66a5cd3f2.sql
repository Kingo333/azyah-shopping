-- Add banner_image_url to retail_events table
ALTER TABLE public.retail_events 
ADD COLUMN banner_image_url TEXT;

-- Add end_date to support multi-day events
ALTER TABLE public.retail_events 
ADD COLUMN end_date DATE;