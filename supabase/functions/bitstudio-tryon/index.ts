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

    // Call actual BitStudio virtual try-on API (correct endpoint from docs)
    const response = await fetch('https://api.bitstudio.ai/images/virtual-try-on', {
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
    console.log('BitStudio raw response:', JSON.stringify(bitStudioResponse, null, 2));

    // BitStudio returns an array of job objects with { id, status, task, etc }
    let resultsArray = Array.isArray(bitStudioResponse) ? bitStudioResponse : [bitStudioResponse];

    const mappedResponse = resultsArray.map(item => {
      // Extract job ID - could be 'id' or nested
      const jobId = item.id || item.job_id || item.generation_id;
      
      if (!jobId) {
        console.error('BitStudio response missing job ID:', item);
      }
      
      return {
        id: jobId,
        type: item.type || 'virtual-try-on',
        status: item.status || 'pending',
        task: item.task || 'virtual-try-on',
        path: item.path || item.url || null,
        credits_used: item.credits_used || 1,
        versions: item.versions || [],
        created_timestamp: item.created_timestamp,
        estimated_completion: item.estimated_completion
      };
    });

    console.log('Mapped try-on response:', JSON.stringify(mappedResponse, null, 2));

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