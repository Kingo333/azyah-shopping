-- Delete all associated data for these users
DELETE FROM brands WHERE owner_user_id IN ('5d288db8-b2b7-4ad1-8ad2-eb69fc297fa3', 'c824f562-d1ea-41c4-8d40-0d620e11b1ba');

DELETE FROM products WHERE brand_id IN (SELECT id FROM brands WHERE owner_user_id IN ('5d288db8-b2b7-4ad1-8ad2-eb69fc297fa3', 'c824f562-d1ea-41c4-8d40-0d620e11b1ba'));

DELETE FROM user_credits WHERE user_id IN ('5d288db8-b2b7-4ad1-8ad2-eb69fc297fa3', 'c824f562-d1ea-41c4-8d40-0d620e11b1ba');

DELETE FROM events WHERE user_id IN ('5d288db8-b2b7-4ad1-8ad2-eb69fc297fa3', 'c824f562-d1ea-41c4-8d40-0d620e11b1ba');

DELETE FROM swipes WHERE user_id IN ('5d288db8-b2b7-4ad1-8ad2-eb69fc297fa3', 'c824f562-d1ea-41c4-8d40-0d620e11b1ba');

DELETE FROM likes WHERE user_id IN ('5d288db8-b2b7-4ad1-8ad2-eb69fc297fa3', 'c824f562-d1ea-41c4-8d40-0d620e11b1ba');

DELETE FROM follows WHERE follower_id IN ('5d288db8-b2b7-4ad1-8ad2-eb69fc297fa3', 'c824f562-d1ea-41c4-8d40-0d620e11b1ba') OR following_id IN ('5d288db8-b2b7-4ad1-8ad2-eb69fc297fa3', 'c824f562-d1ea-41c4-8d40-0d620e11b1ba');

DELETE FROM closets WHERE user_id IN ('5d288db8-b2b7-4ad1-8ad2-eb69fc297fa3', 'c824f562-d1ea-41c4-8d40-0d620e11b1ba');

DELETE FROM looks WHERE user_id IN ('5d288db8-b2b7-4ad1-8ad2-eb69fc297fa3', 'c824f562-d1ea-41c4-8d40-0d620e11b1ba');

DELETE FROM posts WHERE user_id IN ('5d288db8-b2b7-4ad1-8ad2-eb69fc297fa3', 'c824f562-d1ea-41c4-8d40-0d620e11b1ba');

DELETE FROM ai_assets WHERE user_id IN ('5d288db8-b2b7-4ad1-8ad2-eb69fc297fa3', 'c824f562-d1ea-41c4-8d40-0d620e11b1ba');

DELETE FROM ai_tryon_jobs WHERE user_id IN ('5d288db8-b2b7-4ad1-8ad2-eb69fc297fa3', 'c824f562-d1ea-41c4-8d40-0d620e11b1ba');

DELETE FROM beauty_profiles WHERE user_id IN ('5d288db8-b2b7-4ad1-8ad2-eb69fc297fa3', 'c824f562-d1ea-41c4-8d40-0d620e11b1ba');

DELETE FROM beauty_consults WHERE user_id IN ('5d288db8-b2b7-4ad1-8ad2-eb69fc297fa3', 'c824f562-d1ea-41c4-8d40-0d620e11b1ba');

DELETE FROM affiliate_links WHERE user_id IN ('5d288db8-b2b7-4ad1-8ad2-eb69fc297fa3', 'c824f562-d1ea-41c4-8d40-0d620e11b1ba');

DELETE FROM payments WHERE user_id IN ('5d288db8-b2b7-4ad1-8ad2-eb69fc297fa3', 'c824f562-d1ea-41c4-8d40-0d620e11b1ba');

DELETE FROM subscriptions WHERE user_id IN ('5d288db8-b2b7-4ad1-8ad2-eb69fc297fa3', 'c824f562-d1ea-41c4-8d40-0d620e11b1ba');

DELETE FROM user_taste_profiles WHERE user_id IN ('5d288db8-b2b7-4ad1-8ad2-eb69fc297fa3', 'c824f562-d1ea-41c4-8d40-0d620e11b1ba');

DELETE FROM cart_items WHERE user_id IN ('5d288db8-b2b7-4ad1-8ad2-eb69fc297fa3', 'c824f562-d1ea-41c4-8d40-0d620e11b1ba');

-- Finally delete the users from the main users table
DELETE FROM users WHERE email IN ('gabelaka79@gmail.com', 'abdullahiking33@gmail.com');