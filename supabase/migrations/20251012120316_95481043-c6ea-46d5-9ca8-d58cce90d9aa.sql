-- Phase 2: Enable Realtime for event_tryon_jobs table
ALTER TABLE event_tryon_jobs REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE event_tryon_jobs;