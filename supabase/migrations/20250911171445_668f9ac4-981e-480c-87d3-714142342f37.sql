-- Clean up remaining data for abdullahiking33@gmail.com
-- Remove associated brands first (due to foreign key constraints)
DELETE FROM brands WHERE owner_user_id = '7b4bf0e1-4865-4c47-8592-a7dd579382a6';

-- Remove the user record
DELETE FROM users WHERE id = '7b4bf0e1-4865-4c47-8592-a7dd579382a6';