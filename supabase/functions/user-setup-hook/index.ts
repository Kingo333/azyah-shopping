import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebhookPayload {
  type: string
  table: string
  record: {
    id: string
    email: string
    raw_user_meta_data: {
      role?: string
      name?: string
      full_name?: string
    }
  }
  schema: string
  old_record: any
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse webhook payload
    const payload: WebhookPayload = await req.json()
    
    console.log('User setup webhook received:', {
      type: payload.type,
      table: payload.table,
      userId: payload.record?.id,
      email: payload.record?.email
    })

    // Only process INSERT events on auth.users table
    if (payload.type !== 'INSERT' || payload.table !== 'users' || payload.schema !== 'auth') {
      console.log('Ignoring non-user INSERT event')
      return new Response(JSON.stringify({ success: true, message: 'Event ignored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    const userId = payload.record.id
    const email = payload.record.email
    const metadata = payload.record.raw_user_meta_data || {}
    const userRole = metadata.role || 'shopper'
    const userName = metadata.name || metadata.full_name || email.split('@')[0]

    console.log('Setting up new user:', { userId, email, userRole, userName })

    // Create user profile in public.users table
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        email: email,
        name: userName,
        role: userRole,
        provider: 'email',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (userError) {
      console.error('Failed to create user profile:', userError)
      throw new Error(`User profile creation failed: ${userError.message}`)
    }

    console.log('User profile created successfully')

    // Create role-specific records
    if (userRole === 'brand') {
      const brandSlug = userName.toLowerCase()
        .replace(/[^a-zA-Z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') + '-' + Date.now()

      const { error: brandError } = await supabaseAdmin
        .from('brands')
        .insert({
          owner_user_id: userId,
          name: userName,
          slug: brandSlug,
          contact_email: email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (brandError) {
        console.error('Failed to create brand record:', brandError)
        throw new Error(`Brand creation failed: ${brandError.message}`)
      }

      console.log('Brand record created successfully')
    } else if (userRole === 'retailer') {
      const retailerSlug = userName.toLowerCase()
        .replace(/[^a-zA-Z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') + '-' + Date.now()

      const { error: retailerError } = await supabaseAdmin
        .from('retailers')
        .insert({
          owner_user_id: userId,
          name: userName,
          slug: retailerSlug,
          contact_email: email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (retailerError) {
        console.error('Failed to create retailer record:', retailerError)
        throw new Error(`Retailer creation failed: ${retailerError.message}`)
      }

      console.log('Retailer record created successfully')
    }

    console.log('User setup completed successfully for:', userId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User setup completed',
        userId,
        role: userRole
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('User setup webhook error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})