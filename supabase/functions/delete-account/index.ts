import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    // Get user from token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = user.id

    // Delete all associated data for the user
    console.log(`Starting account deletion for user: ${userId}`)

    // Delete from all tables that reference the user
    const tables = [
      'brands',
      'retailers',
      'products',
      'user_credits',
      'events',
      'swipes',
      'likes',
      'follows',
      'closets',
      'looks',
      'posts',
      'ai_assets',
      'ai_tryon_jobs',
      'beauty_profiles',
      'beauty_consults',
      'affiliate_links',
      'payments',
      'subscriptions',
      'user_taste_profiles',
      'cart_items',
      'user_sessions',
      'post_likes',
      'post_images',
      'post_products',
      'look_votes',
      'look_items',
      'look_templates',
      'closet_ratings',
      'closet_items',
      'collab_applications',
      'beauty_consult_events'
    ]

    // Delete user data from all tables
    for (const table of tables) {
      try {
        // For brands and retailers, check ownership first
        if (table === 'brands') {
          const { error } = await supabaseClient
            .from(table)
            .delete()
            .eq('owner_user_id', userId)
          if (error) console.error(`Error deleting from ${table}:`, error)
        } else if (table === 'retailers') {
          const { error } = await supabaseClient
            .from(table)
            .delete()
            .eq('owner_user_id', userId)
          if (error) console.error(`Error deleting from ${table}:`, error)
        } else if (table === 'follows') {
          // Delete both follower and following relationships
          const { error: followerError } = await supabaseClient
            .from(table)
            .delete()
            .eq('follower_id', userId)
          const { error: followingError } = await supabaseClient
            .from(table)
            .delete()
            .eq('following_id', userId)
          if (followerError) console.error(`Error deleting follower from ${table}:`, followerError)
          if (followingError) console.error(`Error deleting following from ${table}:`, followingError)
        } else if (table === 'collab_applications') {
          const { error } = await supabaseClient
            .from(table)
            .delete()
            .eq('shopper_id', userId)
          if (error) console.error(`Error deleting from ${table}:`, error)
        } else {
          // For all other tables, delete by user_id
          const { error } = await supabaseClient
            .from(table)
            .delete()
            .eq('user_id', userId)
          if (error) console.error(`Error deleting from ${table}:`, error)
        }
      } catch (error) {
        console.error(`Error processing table ${table}:`, error)
      }
    }

    // Delete from users table
    const { error: usersError } = await supabaseClient
      .from('users')
      .delete()
      .eq('id', userId)

    if (usersError) {
      console.error('Error deleting from users table:', usersError)
    }

    // Finally, delete the user from Supabase Auth
    const { error: authDeleteError } = await supabaseClient.auth.admin.deleteUser(userId)
    
    if (authDeleteError) {
      console.error('Error deleting from Auth:', authDeleteError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete account from authentication system' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Account deletion completed for user: ${userId}`)

    return new Response(
      JSON.stringify({ success: true, message: 'Account successfully deleted' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Delete account error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to delete account' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})