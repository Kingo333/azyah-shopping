-- Complete user deletion for abdullahiking33@gmail.com (Fixed)
-- This will remove all user data to allow fresh signup

DO $$
DECLARE
    target_user_id uuid;
    target_user_email text := 'abdullahiking33@gmail.com';
BEGIN
    -- First, find the user ID by email
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = target_user_email;
    
    -- If user exists, proceed with deletion
    IF target_user_id IS NOT NULL THEN
        RAISE NOTICE 'Found user % with ID %, proceeding with deletion', target_user_email, target_user_id;
        
        -- Delete from tables in order to avoid foreign key conflicts
        
        -- Delete user interactions and content
        DELETE FROM post_likes WHERE user_id = target_user_id;
        DELETE FROM post_images WHERE post_id IN (SELECT id FROM posts WHERE user_id = target_user_id);
        DELETE FROM post_products WHERE post_id IN (SELECT id FROM posts WHERE user_id = target_user_id);
        DELETE FROM posts WHERE user_id = target_user_id;
        
        -- Delete look-related data
        DELETE FROM look_votes WHERE voter_id = target_user_id;
        DELETE FROM look_items WHERE look_id IN (SELECT id FROM looks WHERE user_id = target_user_id);
        DELETE FROM looks WHERE user_id = target_user_id;
        DELETE FROM look_templates WHERE user_id = target_user_id;
        
        -- Delete closet-related data
        DELETE FROM closet_ratings WHERE user_id = target_user_id;
        DELETE FROM closet_items WHERE closet_id IN (SELECT id FROM closets WHERE user_id = target_user_id);
        DELETE FROM closets WHERE user_id = target_user_id;
        
        -- Delete commerce-related data
        DELETE FROM cart_items WHERE user_id = target_user_id;
        DELETE FROM likes WHERE user_id = target_user_id;
        DELETE FROM swipes WHERE user_id = target_user_id;
        DELETE FROM affiliate_links WHERE user_id = target_user_id;
        
        -- Delete AI and beauty data
        DELETE FROM ai_assets WHERE user_id = target_user_id;
        DELETE FROM ai_tryon_jobs WHERE user_id = target_user_id;
        DELETE FROM beauty_profiles WHERE user_id = target_user_id;
        DELETE FROM beauty_consults WHERE user_id = target_user_id;
        DELETE FROM beauty_consult_events WHERE user_id = target_user_id;
        
        -- Delete collaboration data
        DELETE FROM collab_applications WHERE shopper_id = target_user_id;
        DELETE FROM collab_status_history WHERE changed_by = target_user_id;
        DELETE FROM collaborations WHERE created_by = target_user_id;
        
        -- Delete social connections
        DELETE FROM follows WHERE follower_id = target_user_id OR following_id = target_user_id;
        
        -- Delete import and crawl data
        DELETE FROM crawl_sessions WHERE source_id IN (SELECT id FROM import_sources WHERE user_id = target_user_id);
        DELETE FROM import_jobs WHERE source_id IN (SELECT id FROM import_sources WHERE user_id = target_user_id);
        DELETE FROM import_products_staging WHERE job_id IN (
            SELECT ij.id FROM import_jobs ij 
            JOIN import_sources isrc ON isrc.id = ij.source_id 
            WHERE isrc.user_id = target_user_id
        );
        DELETE FROM import_sources WHERE user_id = target_user_id;
        DELETE FROM import_job_status WHERE user_id = target_user_id;
        
        -- Delete payment and subscription data
        DELETE FROM payments WHERE user_id = target_user_id;
        DELETE FROM subscriptions WHERE user_id = target_user_id;
        DELETE FROM user_credits WHERE user_id = target_user_id;
        DELETE FROM user_taste_profiles WHERE user_id = target_user_id;
        
        -- Delete brand and retailer ownership
        DELETE FROM brands WHERE owner_user_id = target_user_id;
        DELETE FROM retailers WHERE owner_user_id = target_user_id;
        
        -- Delete events and audit logs
        DELETE FROM events WHERE user_id = target_user_id;
        DELETE FROM security_audit_log WHERE user_id = target_user_id OR accessed_user_id = target_user_id;
        
        -- Delete public profile if it exists
        DELETE FROM public_profiles WHERE id = target_user_id;
        
        -- Finally, delete from users table
        DELETE FROM public.users WHERE id = target_user_id;
        
        -- Delete from auth.users (this must be last)
        DELETE FROM auth.users WHERE id = target_user_id;
        
        RAISE NOTICE 'Successfully deleted user % and all associated data', target_user_email;
    ELSE
        RAISE NOTICE 'User % not found in the system', target_user_email;
    END IF;
END $$;