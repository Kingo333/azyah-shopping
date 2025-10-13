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
    console.log('[BitStudio-Tryon] Request params:', {
      person_image_id: params.person_image_id ? 'present' : 'missing',
      person_image_url: params.person_image_url ? 'present' : 'missing',
      outfit_image_id: params.outfit_image_id ? 'present' : 'missing',
      outfit_image_url: params.outfit_image_url ? 'present' : 'missing',
      resolution: params.resolution || 'standard',
      num_images: params.num_images || 1
    });

    // Validate required parameters (must have IDs, not URLs for this setup)
    if (!params.person_image_id) {
      console.error('[BitStudio-Tryon] Missing person_image_id');
      return new Response(
        JSON.stringify({ 
          error: 'Missing person_image_id',
          code: 'MISSING_PERSON_ID',
          details: { person_image_id: !!params.person_image_id }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!params.outfit_image_id) {
      console.error('[BitStudio-Tryon] Missing outfit_image_id');
      return new Response(
        JSON.stringify({ 
          error: 'Missing outfit_image_id',
          code: 'MISSING_OUTFIT_ID',
          details: { outfit_image_id: !!params.outfit_image_id }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call actual BitStudio virtual try-on API (correct endpoint from docs)
    console.log('[BitStudio-Tryon] Calling BitStudio API...');
    const response = await fetch('https://api.bitstudio.ai/images/virtual-try-on', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bitStudioApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        person_image_id: params.person_image_id,
        outfit_image_id: params.outfit_image_id,
        prompt: params.prompt,
        resolution: params.resolution || 'standard',
        num_images: params.num_images || 1,
        seed: params.seed,
      }),
    });

    console.log('[BitStudio-Tryon] BitStudio HTTP status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[BitStudio-Tryon] BitStudio API error:', response.status, errorText);
      
      // Handle specific error codes from BitStudio docs
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded. Please try again in a few moments.',
            code: 'RATE_LIMITED'
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: 'Insufficient credits or subscription required',
            code: 'insufficient_credits'
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 403) {
        return new Response(
          JSON.stringify({ 
            error: 'Feature requires upgrade',
            code: 'upgrade_required'
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`BitStudio API returned ${response.status}: ${errorText}`);
    }

    const bitStudioResponse = await response.json();
    console.log('[BitStudio-Tryon] BitStudio raw response:', JSON.stringify(bitStudioResponse, null, 2));

    // BitStudio returns an array of job objects with { id, status, task, etc }
    let resultsArray = Array.isArray(bitStudioResponse) ? bitStudioResponse : [bitStudioResponse];
    
    if (resultsArray.length === 0) {
      console.error('[BitStudio-Tryon] Empty results array from BitStudio');
      return new Response(
        JSON.stringify({ 
          error: 'BitStudio returned empty results',
          code: 'EMPTY_RESULTS'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mappedResponse = resultsArray.map(item => {
      // Extract job ID - could be 'id' or nested
      const jobId = item.id || item.job_id || item.generation_id;
      
      if (!jobId) {
        console.error('[BitStudio-Tryon] CRITICAL: BitStudio response missing job ID:', JSON.stringify(item, null, 2));
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

    console.log('[BitStudio-Tryon] Mapped try-on response:', JSON.stringify(mappedResponse, null, 2));

    return new Response(
      JSON.stringify(mappedResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[BitStudio-Tryon] Catch block error:', error);
    
    // Preserve error codes if present
    const errorCode = error.code || 'UNKNOWN_ERROR';
    const errorMessage = error.message || error.error || 'Try-on failed';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        code: errorCode,
        details: error.details || null,
        bitstudio_error: error.cause || null
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});