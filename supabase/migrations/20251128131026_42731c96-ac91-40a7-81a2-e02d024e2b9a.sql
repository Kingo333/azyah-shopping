-- Fix RLS policies for friendships table to allow pending requests visibility

-- Drop existing policies
DROP POLICY IF EXISTS friendships_select ON friendships;
DROP POLICY IF EXISTS friendships_insert ON friendships;
DROP POLICY IF EXISTS friendships_update ON friendships;
DROP POLICY IF EXISTS friendships_delete ON friendships;

-- SELECT: Both parties see accepted friendships, recipients see pending requests
CREATE POLICY friendships_select ON friendships FOR SELECT
  USING (
    (status = 'accepted' AND (auth.uid() = user_id OR auth.uid() = friend_id))
    OR 
    (status = 'pending' AND auth.uid() = friend_id)
  );

-- INSERT: Only requester can create pending requests
CREATE POLICY friendships_insert ON friendships FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- UPDATE: Both parties can update the friendship status
CREATE POLICY friendships_update ON friendships FOR UPDATE
  USING (auth.uid() IN (user_id, friend_id));

-- DELETE: Only requester can delete pending or accepted friendships
CREATE POLICY friendships_delete ON friendships FOR DELETE
  USING (auth.uid() = user_id AND status IN ('pending', 'accepted'));