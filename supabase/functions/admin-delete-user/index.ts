import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Delete user abdullahiking33@gmail.com completely
    const email = 'abdullahiking33@gmail.com'
    const justification = 'User deletion requested by administrator via Lovable interface'

    console.log(`Starting complete deletion for user: ${email}`)
    
    // Step 1: Delete all user data from public schema
    const { data: deletionResult, error: deletionError } = await supabaseAdmin
      .rpc('delete_user_completely', { target_email: email })

    if (deletionError) {
      console.error('Error during public data deletion:', deletionError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to delete user data', 
          details: deletionError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Public data deletion result:', deletionResult)

    if (!deletionResult.success) {
      return new Response(
        JSON.stringify({ 
          error: deletionResult.message 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Step 2: Delete user from auth.users table
    const userId = deletionResult.user_id
    
    // Delete from auth schema using admin client
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(
      userId,
      true // shouldSoftDelete = false for permanent deletion
    )

    if (authDeleteError) {
      console.error('Error deleting from auth.users:', authDeleteError)
      return new Response(
        JSON.stringify({
          error: 'User data deleted but failed to remove from authentication system',
          details: authDeleteError.message,
          publicDataDeleted: true,
          summary: deletionResult
        }),
        { 
          status: 207, // Multi-status (partial success)
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Successfully deleted user ${email} from both public schema and auth system`)

    // Return complete success
    return new Response(
      JSON.stringify({
        success: true,
        message: `User ${email} has been completely removed from the system`,
        summary: deletionResult,
        authDeleted: true,
        deletedAt: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error during user deletion:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})