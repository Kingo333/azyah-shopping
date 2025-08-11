
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the API key from environment variables
    const BITSTUDIO_API_KEY = Deno.env.get('BITSTUDIO_API_KEY');
    const BITSTUDIO_API_BASE = Deno.env.get('BITSTUDIO_API_BASE') || 'https://api.bitstudio.ai';

    console.log('[health] API key present:', !!BITSTUDIO_API_KEY);
    console.log('[health] API base URL:', BITSTUDIO_API_BASE);

    if (!BITSTUDIO_API_KEY) {
      console.error('[health] BitStudio API key not configured');
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: 'BitStudio API key not configured',
          code: 'MISSING_API_KEY'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Test the API connection by making a simple request
    const testResponse = await fetch(`${BITSTUDIO_API_BASE}/images`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${BITSTUDIO_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('[health] Test API response status:', testResponse.status);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: 'Invalid authentication',
          code: 'INVALID_AUTH'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Check if the API responded successfully (even if empty list)
    const apiWorking = testResponse.status === 200 || testResponse.status === 401;
    
    // Sanitize the base URL for response
    const sanitizedBase = BITSTUDIO_API_BASE.replace(/\/+$/, '');

    return new Response(
      JSON.stringify({ 
        ok: apiWorking, 
        base: sanitizedBase,
        authenticated: true,
        user_id: user.id,
        api_status: testResponse.status
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[health] Health check error:', error);
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: 'Health check failed', 
        details: error.message,
        code: 'HEALTH_CHECK_ERROR'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
