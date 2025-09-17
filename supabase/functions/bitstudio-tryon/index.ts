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

    // Call actual BitStudio virtual try-on API
    const response = await fetch('https://api.bitstudio.ai/v1/images/virtual-try-on', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bitStudioApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        person_image_id: params.person_image_id,
        person_image_url: params.person_image_url,
        outfit_image_id: params.outfit_image_id,
        outfit_image_url: params.outfit_image_url,
        prompt: params.prompt,
        resolution: params.resolution || 'standard',
        num_images: params.num_images || 1,
        seed: params.seed,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('BitStudio API error:', response.status, errorText);
      throw new Error(`BitStudio API error: ${response.status} - ${errorText}`);
    }

    const bitStudioResponse = await response.json();
    console.log('BitStudio try-on response:', bitStudioResponse);

    // Map BitStudio response to our expected format
    const mappedResponse = Array.isArray(bitStudioResponse) 
      ? bitStudioResponse.map(item => ({
          id: item.id || item.job_id,
          type: 'virtual-try-on',
          status: item.status || 'pending',
          path: item.url || item.path,
          credits_used: item.credits_used || 1
        }))
      : [{
          id: bitStudioResponse.id || bitStudioResponse.job_id,
          type: 'virtual-try-on',
          status: bitStudioResponse.status || 'pending',
          path: bitStudioResponse.url || bitStudioResponse.path,
          credits_used: bitStudioResponse.credits_used || 1
        }];

    return new Response(
      JSON.stringify(mappedResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Try-on error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Try-on failed', 
        details: error.message,
        bitstudio_error: error.cause || null
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});