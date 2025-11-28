-- Create friendships table
CREATE TABLE IF NOT EXISTS friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

CREATE INDEX IF NOT EXISTS friendships_user_idx ON friendships(user_id);
CREATE INDEX IF NOT EXISTS friendships_friend_idx ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS friendships_status_idx ON friendships(status);

-- Enable RLS
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Users can view accepted friendships they're part of
CREATE POLICY friendships_select ON friendships FOR SELECT
  USING (status = 'accepted' AND (auth.uid() = user_id OR auth.uid() = friend_id));

-- Users can create friend requests
CREATE POLICY friendships_insert ON friendships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update friendships they received (to accept/reject)
CREATE POLICY friendships_update ON friendships FOR UPDATE
  USING (auth.uid() = friend_id);

-- Users can delete their own requests or received requests
CREATE POLICY friendships_delete ON friendships FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Create view for easy friend lookup
CREATE OR REPLACE VIEW v_my_friends AS
SELECT 
  CASE WHEN f.user_id = auth.uid() THEN f.friend_id ELSE f.user_id END as friend_id,
  f.created_at as friends_since
FROM friendships f
WHERE f.status = 'accepted' 
  AND (f.user_id = auth.uid() OR f.friend_id = auth.uid());

-- Add gifted_to and context columns to fits table
ALTER TABLE fits 
  ADD COLUMN IF NOT EXISTS gifted_to uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS context text DEFAULT 'self' CHECK (context IN ('self', 'friend'));

CREATE INDEX IF NOT EXISTS fits_gifted_to_idx ON fits(gifted_to);

-- Update fits RLS policy to include gifted_to
DROP POLICY IF EXISTS fits_select_owner_or_public ON fits;
CREATE POLICY fits_select_owner_or_public ON fits FOR SELECT
  USING (
    auth.uid() = user_id 
    OR auth.uid() = gifted_to 
    OR is_public = true
  );