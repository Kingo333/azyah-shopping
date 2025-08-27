-- Create user sessions table for beauty consultant
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  session_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_activity TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours'),
  preferences JSONB DEFAULT '{}'::jsonb,
  conversation_history JSONB DEFAULT '[]'::jsonb,
  session_data JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Enable RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "user read own sessions"
  ON user_sessions FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "user insert own sessions"
  ON user_sessions FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "user update own sessions"
  ON user_sessions FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('azyah-audio', 'azyah-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for audio files
CREATE POLICY "Anyone can view audio files"
ON storage.objects FOR SELECT
USING (bucket_id = 'azyah-audio');

CREATE POLICY "Service role can upload audio files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'azyah-audio' AND auth.role() = 'service_role');

CREATE POLICY "Service role can update audio files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'azyah-audio' AND auth.role() = 'service_role');

CREATE POLICY "Service role can delete audio files"
ON storage.objects FOR DELETE
USING (bucket_id = 'azyah-audio' AND auth.role() = 'service_role');