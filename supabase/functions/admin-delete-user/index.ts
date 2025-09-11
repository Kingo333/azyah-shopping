import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UserDeletionRequest {
  email: string;
  justification: string;
  forceDelete?: boolean;
  checkOnly?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { email, justification, forceDelete = false, checkOnly = false }: UserDeletionRequest = await req.json()

    if (!email || (!justification && !checkOnly)) {
      return new Response(
        JSON.stringify({ 
          error: 'Email and justification are required',
          received: { email: !!email, justification: !!justification, checkOnly }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

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

    console.log(`Starting ${checkOnly ? 'status check' : 'enhanced deletion'} for user: ${email}`)
    console.log(`Justification: ${justification}`)
    console.log(`Force delete: ${forceDelete}, Check only: ${checkOnly}`)
    
    // Step 1: Check if user exists in public.users (case insensitive)
    const { data: publicUser, error: publicCheckError } = await supabaseAdmin
      .from('users')
      .select('id, email, role, created_at')
      .ilike('email', email.trim())
      .maybeSingle()

    if (publicCheckError) {
      console.error('Error checking public.users:', publicCheckError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to check user existence in public schema', 
          details: publicCheckError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Step 2: Check if user exists in auth.users (by looking up with public user ID if available)
    let authUser = null
    let authUserId = null

    if (publicUser) {
      // Try to find auth user by ID from public user
      const { data: authUserData, error: authCheckError } = await supabaseAdmin.auth.admin.getUserById(publicUser.id)
      if (!authCheckError && authUserData.user) {
        authUser = authUserData.user
        authUserId = authUser.id
      }
    } else {
      // Try to find auth user by email directly (case insensitive)
      const { data: authUsersByEmail, error: authEmailError } = await supabaseAdmin.auth.admin.listUsers()
      if (!authEmailError && authUsersByEmail.users) {
        authUser = authUsersByEmail.users.find(u => 
          u.email?.toLowerCase() === email.trim().toLowerCase()
        )
        authUserId = authUser?.id
      }
    }

    const isOrphaned = !!publicUser && !authUser;
    
    console.log(`User status check:`)
    console.log(`- Public user found: ${!!publicUser} ${publicUser ? `(ID: ${publicUser.id})` : ''}`)
    console.log(`- Auth user found: ${!!authUser} ${authUser ? `(ID: ${authUser.id})` : ''}`)
    console.log(`- Is orphaned: ${isOrphaned}`)

    // If this is just a status check, return the status
    if (checkOnly) {
      return new Response(
        JSON.stringify({
          success: true,
          userFound: {
            inPublic: !!publicUser,
            inAuth: !!authUser
          },
          isOrphaned,
          publicUser: publicUser ? {
            id: publicUser.id,
            email: publicUser.email,
            role: publicUser.role,
            created_at: publicUser.created_at
          } : null
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // If no user found anywhere and not force delete, return appropriate message
    if (!publicUser && !authUser && !forceDelete) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `No user found with email: ${email}`,
          checked: {
            publicSchema: 'not found',
            authSchema: 'not found'
          }
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    let deletionSummary: any = {
      userFound: {
        inPublic: !!publicUser,
        inAuth: !!authUser
      },
      isOrphaned,
      forceDelete,
      deletionSteps: []
    }

    // Step 3: Delete from public schema if user exists there
    if (publicUser) {
      console.log('Deleting user data from public schema...')
      
      const { data: publicDeletionResult, error: publicDeletionError } = await supabaseAdmin
        .rpc('delete_user_completely', { 
          target_email: email.trim(),
          force_orphaned_deletion: forceDelete || isOrphaned
        })

      if (publicDeletionError) {
        console.error('Error during public data deletion:', publicDeletionError)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to delete user data from public schema', 
            details: publicDeletionError.message 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      deletionSummary.publicDeletion = publicDeletionResult
      deletionSummary.deletionSteps.push('Public schema data deleted')
      console.log('Public data deletion completed:', publicDeletionResult)
    } else {
      deletionSummary.deletionSteps.push('No public schema data to delete')
    }

    // Step 4: Delete from auth.users if user exists there
    if (authUser && authUserId) {
      console.log('Deleting user from auth system...')
      
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(
        authUserId,
        true // shouldSoftDelete = false for permanent deletion
      )

      if (authDeleteError) {
        console.error('Error deleting from auth.users:', authDeleteError)
        deletionSummary.authDeletionError = authDeleteError.message
        deletionSummary.deletionSteps.push('Auth deletion failed')
        
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to delete user from authentication system',
            details: authDeleteError.message,
            summary: deletionSummary
          }),
          { 
            status: 207, // Multi-status (partial success)
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      deletionSummary.authDeleted = true
      deletionSummary.deletionSteps.push('Auth user deleted')
      console.log('Auth user deletion completed')
    } else {
      deletionSummary.deletionSteps.push('No auth user to delete')
    }

    // Step 5: Final verification - check if user still exists anywhere
    const { data: verifyPublic } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email.trim())
      .maybeSingle()

    deletionSummary.verification = {
      publicUserRemaining: !!verifyPublic,
      deletionComplete: !verifyPublic
    }

    console.log(`Deletion completed for user ${email}`)
    console.log('Final verification:', deletionSummary.verification)

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: `User ${email} has been completely removed from the system`,
        email: email,
        justification: justification,
        summary: deletionSummary,
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
        details: error.message,
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})