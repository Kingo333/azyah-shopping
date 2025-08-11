
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BITSTUDIO_API_KEY = Deno.env.get('BITSTUDIO_API_KEY');
    let BITSTUDIO_API_BASE = Deno.env.get('BITSTUDIO_API_BASE') || 'https://api.bitstudio.ai';
    BITSTUDIO_API_BASE = BITSTUDIO_API_BASE.replace(/\/+$/, '');

    console.log('[health] API key present:', !!BITSTUDIO_API_KEY);
    console.log('[health] API key length:', BITSTUDIO_API_KEY ? BITSTUDIO_API_KEY.length : 0);
    console.log('[health] API key first 8 chars:', BITSTUDIO_API_KEY ? BITSTUDIO_API_KEY.substring(0, 8) + '...' : 'none');
    console.log('[health] API base URL:', BITSTUDIO_API_BASE);

    if (!BITSTUDIO_API_KEY || BITSTUDIO_API_KEY.trim() === '') {
      console.error('[health] BitStudio API key not configured or empty');
      return new Response(
        JSON.stringify({ 
          ok: false,
          error: 'BitStudio API key not configured. Please check your Supabase secrets.',
          base: BITSTUDIO_API_BASE
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Test API key by making a simple request
    try {
      const testUrl = `${BITSTUDIO_API_BASE}/images/test-nonexistent-id`;
      console.log('[health] Testing API key with:', testUrl);

      const testResponse = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${BITSTUDIO_API_KEY.trim()}`,
        },
      });

      console.log('[health] Test response status:', testResponse.status);

      // 404 is expected for a non-existent ID, but it means our API key works
      // 401 would mean invalid API key
      if (testResponse.status === 401) {
        console.error('[health] API key appears to be invalid (401)');
        return new Response(
          JSON.stringify({ 
            ok: false,
            error: 'API key appears to be invalid. Please check your BITSTUDIO_API_KEY secret.',
            base: BITSTUDIO_API_BASE,
            test_status: 401
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[health] API key validation successful');
      return new Response(
        JSON.stringify({ 
          ok: true,
          base: BITSTUDIO_API_BASE,
          api_key_configured: true,
          api_key_length: BITSTUDIO_API_KEY.length,
          test_status: testResponse.status
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (testError) {
      console.error('[health] API key test failed:', testError);
      return new Response(
        JSON.stringify({ 
          ok: false,
          error: 'Failed to test API connection. Network or API issues.',
          base: BITSTUDIO_API_BASE,
          details: (testError as any)?.message
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('[health] Health check error:', error);
    return new Response(
      JSON.stringify({ 
        ok: false,
        error: 'Health check failed',
        details: (error as any)?.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
