-- Create blocked_users table for UGC compliance (Block User feature)
CREATE TABLE public.blocked_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- Enable RLS
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- Users can only see their own blocks
CREATE POLICY "Users can view their own blocks"
ON public.blocked_users
FOR SELECT
USING (auth.uid() = blocker_id);

-- Users can only create their own blocks
CREATE POLICY "Users can create their own blocks"
ON public.blocked_users
FOR INSERT
WITH CHECK (auth.uid() = blocker_id);

-- Users can only remove their own blocks
CREATE POLICY "Users can delete their own blocks"
ON public.blocked_users
FOR DELETE
USING (auth.uid() = blocker_id);

-- Index for fast lookups
CREATE INDEX idx_blocked_users_blocker ON public.blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked ON public.blocked_users(blocked_id);