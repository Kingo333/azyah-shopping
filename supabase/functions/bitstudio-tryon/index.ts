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
    const params = await req.json();
    console.log('BitStudio try-on params:', params);

    // Validate required parameters
    if (!params.person_image_id && !params.person_image_url) {
      return new Response(
        JSON.stringify({ error: 'Missing person image parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!params.outfit_image_id && !params.outfit_image_url) {
      return new Response(
        JSON.stringify({ error: 'Missing outfit image parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mock response for now - replace with actual BitStudio API call
    const mockResponse = {
      id: `tryon_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      type: 'virtual-try-on',
      status: 'completed',
      path: `https://bitstudio.placeholder/tryon-result-${Date.now()}.png`,
      credits_used: 1
    };

    console.log('BitStudio try-on response:', mockResponse);

    return new Response(
      JSON.stringify(mockResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Try-on error:', error);
    return new Response(
      JSON.stringify({ error: 'Try-on failed', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});