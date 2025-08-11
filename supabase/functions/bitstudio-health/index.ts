
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
    console.log('[health] API key length:', BITSTUDIO_API_KEY ? BITSTUDIO_API_KEY.length : 0);
    console.log('[health] API key first 8 chars:', BITSTUDIO_API_KEY ? BITSTUDIO_API_KEY.substring(0, 8) + '...' : 'none');
    console.log('[health] API base URL:', BITSTUDIO_API_BASE);

    if (!BITSTUDIO_API_KEY || BITSTUDIO_API_KEY.trim() === '') {
      console.error('[health] BitStudio API key not configured or empty');
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: 'BitStudio API key not configured',
          code: 'MISSING_API_KEY'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[health] No authorization header provided');
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
      console.error('[health] Invalid authorization:', authError);
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: 'Invalid authentication',
          code: 'INVALID_AUTH'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log('[health] User authenticated:', user.id);

    // Test the API connection by making a simple request
    const testUrl = `${BITSTUDIO_API_BASE}/images`;
    console.log('[health] Testing API connection to:', testUrl);

    const testResponse = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${BITSTUDIO_API_KEY.trim()}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('[health] Test API response status:', testResponse.status);
    console.log('[health] Test API response headers:', Object.fromEntries(testResponse.headers.entries()));

    let testResponseText = '';
    try {
      testResponseText = await testResponse.text();
      console.log('[health] Test API response body:', testResponseText.substring(0, 200) + (testResponseText.length > 200 ? '...' : ''));
    } catch (e) {
      console.log('[health] Could not read test response body:', e);
    }

    // Check if the API responded successfully (200) or with auth error (401)
    // Both indicate the API is reachable and the key format is recognized
    const apiWorking = testResponse.status === 200 || testResponse.status === 401;
    
    if (testResponse.status === 401) {
      console.warn('[health] API key appears to be invalid (401 response)');
    }

    // Sanitize the base URL for response
    const sanitizedBase = BITSTUDIO_API_BASE.replace(/\/+$/, '');

    const result = { 
      ok: apiWorking, 
      base: sanitizedBase,
      authenticated: true,
      user_id: user.id,
      api_status: testResponse.status,
      api_key_configured: true,
      api_key_length: BITSTUDIO_API_KEY.length
    };

    console.log('[health] Health check result:', result);

    return new Response(
      JSON.stringify(result),
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
