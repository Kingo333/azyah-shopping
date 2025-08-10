
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
    const BITSTUDIO_API_BASE = Deno.env.get('BITSTUDIO_API_BASE') || 'https://api.bitstudio.ai';

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
      base_image_id,
      mask_image_id,
      reference_image_id,
      prompt,
      denoise = 0.4,
      num_images = 1
    } = body;

    // Validate required parameters
    if (!base_image_id || !mask_image_id) {
      return new Response(
        JSON.stringify({ error: 'Base image ID and mask image ID are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Create inpaint job in database
    const { data: jobData, error: jobError } = await supabase
      .from('ai_tryon_jobs')
      .insert({
        user_id: user.id,
        provider: 'bitstudio',
        provider_job_id: base_image_id,
        status: 'pending',
        num_images
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

    // Make request to bitStudio API
    const requestBody = {
      mask_image_id,
      reference_image_id,
      prompt,
      denoise,
      num_images
    };

    // Remove undefined values
    Object.keys(requestBody).forEach(key => 
      requestBody[key] === undefined && delete requestBody[key]
    );

    const response = await fetch(`${BITSTUDIO_API_BASE}/images/${base_image_id}/inpaint`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BITSTUDIO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

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
      
      throw new Error(`bitStudio API error: ${response.status}`);
    }

    const result = await response.json();
    
    // Update job status to generating
    await supabase
      .from('ai_tryon_jobs')
      .update({ 
        status: 'generating'
      })
      .eq('id', jobData.id);

    return new Response(
      JSON.stringify({ 
        job_id: jobData.id,
        id: base_image_id, // Return base image ID for polling
        result: result 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Inpaint error:', error);
    return new Response(
      JSON.stringify({ error: 'Inpaint failed', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
