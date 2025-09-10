import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get user from JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const url = new URL(req.url)
    const userId = url.searchParams.get('user_id')
    const type = url.searchParams.get('type')

    // Validate user can only access their own data
    if (userId && userId !== user.id) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (req.method === 'GET') {
      let result;

      switch (type) {
        case 'summary':
          // Get user analytics summary
          const { data: summaryData, error: summaryError } = await supabase
            .rpc('get_user_analytics_summary', { target_user_id: user.id })

          if (summaryError) {
            console.error('Summary error:', summaryError)
            return new Response(JSON.stringify({ error: summaryError.message }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
          }

          result = summaryData?.[0] || {
            total_swipes: 0,
            positive_swipes: 0,
            negative_swipes: 0,
            wishlist_actions: 0,
            top_categories: {},
            top_brands: {},
            recent_activity: [],
            preference_confidence: 0
          }
          break

        case 'preferences':
          // Get user taste profile preferences
          const { data: profileData, error: profileError } = await supabase
            .from('user_taste_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single()

          if (profileError && profileError.code !== 'PGRST116') {
            console.error('Profile error:', profileError)
            return new Response(JSON.stringify({ error: profileError.message }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
          }

          result = profileData || {
            category_preferences: {},
            brand_preferences: {},
            price_preferences: {},
            total_swipes: 0,
            positive_swipes: 0,
            negative_swipes: 0,
            preference_confidence: 0
          }
          break

        case 'recent-activity':
          // Get recent swipes (last 20)
          const { data: activityData, error: activityError } = await supabase
            .from('swipes')
            .select(`
              *,
              products:product_id (
                id,
                title,
                category_slug,
                image_url,
                price_cents,
                currency
              )
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20)

          if (activityError) {
            console.error('Activity error:', activityError)
            return new Response(JSON.stringify({ error: activityError.message }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
          }

          result = activityData || []
          break

        default:
          return new Response(JSON.stringify({ error: 'Invalid type parameter' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
      }

      return new Response(JSON.stringify({ data: result, success: true }), {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300' // 5-minute cache
        },
      })
    }

    if (req.method === 'POST') {
      const body = await req.json()
      
      if (url.pathname.endsWith('/batch-track')) {
        // Batch track analytics events
        const { events } = body
        
        if (!events || !Array.isArray(events)) {
          return new Response(JSON.stringify({ error: 'Events array required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const { data: batchResult, error: batchError } = await supabase
          .rpc('batch_track_analytics', {
            target_user_id: user.id,
            events_data: events
          })

        if (batchError) {
          console.error('Batch tracking error:', batchError)
          return new Response(JSON.stringify({ error: batchError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        return new Response(JSON.stringify({ 
          data: batchResult, 
          success: true 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Analytics API error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})