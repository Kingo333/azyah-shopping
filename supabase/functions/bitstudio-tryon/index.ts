
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
    const BITSTUDIO_API_KEY = Deno.env.get('BITSTUDIO_API_KEY');
    let BITSTUDIO_API_BASE = Deno.env.get('BITSTUDIO_API_BASE') || 'https://api.bitstudio.ai';
    
    // Remove any trailing slashes and /v1 - BitStudio API doesn't use /v1
    BITSTUDIO_API_BASE = BITSTUDIO_API_BASE.replace(/\/+$/, '').replace(/\/v1$/, '');

    if (!BITSTUDIO_API_KEY) {
      throw new Error('bitStudio API key not configured');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const body = await req.json();
    const {
      person_image_id,
      person_image_url,
      outfit_image_id,
      outfit_image_url,
      resolution = 'standard',
      num_images = 1,
      seed,
      prompt
    } = body;

    console.log('Virtual try-on request:', {
      person_image_id,
      person_image_url: person_image_url ? 'provided' : 'not provided',
      outfit_image_id,
      outfit_image_url: outfit_image_url ? 'provided' : 'not provided',
      resolution,
      num_images
    });

    // Validate required parameters
    if ((!person_image_id && !person_image_url) || (!outfit_image_id && !outfit_image_url)) {
      return new Response(
        JSON.stringify({ error: 'Both person and outfit images are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Create try-on job in database first
    const { data: jobData, error: jobError } = await supabase
      .from('ai_tryon_jobs')
      .insert({
        user_id: user.id,
        person_image_id: person_image_id || null,
        outfit_image_id: outfit_image_id || null,
        resolution,
        num_images,
        status: 'pending'
      })
      .select()
      .single();

    if (jobError) {
      console.error('Database error:', jobError);
      return new Response(
        JSON.stringify({ error: 'Failed to create job record' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Make request to bitStudio API - use correct endpoint without /v1
    const requestBody = {
      person_image_id,
      person_image_url,
      outfit_image_id,
      outfit_image_url,
      resolution,
      num_images,
      seed,
      prompt
    };

    // Remove undefined values
    Object.keys(requestBody).forEach(key => 
      requestBody[key] === undefined && delete requestBody[key]
    );

    console.log('Making request to BitStudio with body:', requestBody);

    const response = await fetch(`${BITSTUDIO_API_BASE}/images/virtual-try-on`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BITSTUDIO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('BitStudio virtual try-on response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('bitStudio API error:', response.status, errorText);
      
      // Update job status to failed
      await supabase
        .from('ai_tryon_jobs')
        .update({ 
          status: 'failed',
          error: { message: errorText, status: response.status }
        })
        .eq('id', jobData.id);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
        );
      }
      
      throw new Error(`bitStudio API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('BitStudio virtual try-on response:', result);
    
    // Extract job ID from first result (bitStudio returns array)
    const providerJobId = Array.isArray(result) && result.length > 0 ? result[0].id : null;
    
    // Update job with provider job ID
    if (providerJobId) {
      await supabase
        .from('ai_tryon_jobs')
        .update({ 
          provider_job_id: providerJobId,
          status: 'generating'
        })
        .eq('id', jobData.id);
    }

    return new Response(
      JSON.stringify({ 
        job_id: jobData.id,
        provider_job_id: providerJobId,
        result: result 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Try-on error:', error);
    return new Response(
      JSON.stringify({ error: 'Try-on failed', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
