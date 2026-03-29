import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const bitStudioApiKey = Deno.env.get('BITSTUDIO_API_KEY');
    if (!bitStudioApiKey) {
      throw new Error('BitStudio API key not configured');
    }

    console.log('Checking BitStudio API health...');

    // Call actual BitStudio health check API (or test with images endpoint)
    const response = await fetch('https://api.bitstudio.ai/health', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${bitStudioApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('BitStudio API health check failed:', response.status, errorText);
      return new Response(
        JSON.stringify({
          ok: false,
          error: `BitStudio API health check failed: ${response.status}`,
          details: errorText,
          timestamp: new Date().toISOString()
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const bitStudioResponse = await response.json();
    console.log('BitStudio health check response:', bitStudioResponse);

    // Map BitStudio response to our expected format
    const healthResponse = {
      ok: bitStudioResponse.ok !== false,
      base: bitStudioResponse.service || 'BitStudio API',
      timestamp: new Date().toISOString(),
      version: bitStudioResponse.version || '1.0.0',
      status: bitStudioResponse.status,
      details: bitStudioResponse
    };

    return new Response(
      JSON.stringify(healthResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Health check error:', error);
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: error.message,
        timestamp: new Date().toISOString(),
        details: 'Unable to connect to BitStudio API'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});