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

    // Extract ID from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 1];

    if (!id || id === 'bitstudio-status') {
      return new Response(
        JSON.stringify({ error: 'Missing image ID in URL path' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Checking BitStudio status for ID:', id);

    // Call actual BitStudio status API
    const response = await fetch(`https://api.bitstudio.ai/v1/status/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${bitStudioApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('BitStudio API error:', response.status, errorText);
      throw new Error(`BitStudio API error: ${response.status} - ${errorText}`);
    }

    const bitStudioResponse = await response.json();
    console.log('BitStudio status response:', bitStudioResponse);

    // Map BitStudio response to our expected format
    const mappedResponse = {
      id: bitStudioResponse.id || id,
      type: bitStudioResponse.type || 'virtual-try-on',
      status: bitStudioResponse.status,
      path: bitStudioResponse.url || bitStudioResponse.path,
      credits_used: bitStudioResponse.credits_used || 0,
      error: bitStudioResponse.error,
      video_path: bitStudioResponse.video_url || bitStudioResponse.video_path
    };

    return new Response(
      JSON.stringify(mappedResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Status check error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Status check failed', 
        details: error.message,
        bitstudio_error: error.cause || null
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});