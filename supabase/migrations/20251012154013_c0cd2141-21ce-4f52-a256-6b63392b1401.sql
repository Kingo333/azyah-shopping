-- Add BitStudio image ID column to event_user_photos
ALTER TABLE event_user_photos 
ADD COLUMN IF NOT EXISTS bitstudio_image_id TEXT;