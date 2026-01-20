-- Add credits for shopper@test.com as compensation
UPDATE user_credits 
SET 
  ai_studio_credits = ai_studio_credits + 5,
  video_credits = video_credits + 2
WHERE user_id = 'd87d60a3-75d8-43ef-b97b-ce660fbf3199';