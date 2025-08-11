
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
    let BITSTUDIO_API_BASE = Deno.env.get('BITSTUDIO_API_BASE') || 'https://api.bitstudio.ai';
    
    // Remove any trailing slashes - BitStudio API doesn't use /v1
    BITSTUDIO_API_BASE = BITSTUDIO_API_BASE.replace(/\/+$/, '');

    console.log('[tryon] API key present:', !!BITSTUDIO_API_KEY);
    console.log('[tryon] API key length:', BITSTUDIO_API_KEY ? BITSTUDIO_API_KEY.length : 0);
    console.log('[tryon] API base URL:', BITSTUDIO_API_BASE);

    if (!BITSTUDIO_API_KEY || BITSTUDIO_API_KEY.trim() === '') {
      console.error('[tryon] BitStudio API key not configured or empty');
      throw new Error('BitStudio API key not configured');
    }

    // Get user from auth header first
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[tryon] No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Create Supabase client with the user's token
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('[tryon] Invalid authorization:', authError);
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

    console.log('[tryon] Virtual try-on request:', {
      person_image_id: person_image_id ? `provided: ${person_image_id}` : 'not provided',
      person_image_url: person_image_url ? 'provided (URL)' : 'not provided',
      outfit_image_id: outfit_image_id ? `provided: ${outfit_image_id}` : 'not provided',
      outfit_image_url: outfit_image_url ? 'provided (URL)' : 'not provided',
      resolution,
      num_images,
      user_id: user.id
    });

    // Validate required parameters
    if ((!person_image_id && !person_image_url) || (!outfit_image_id && !outfit_image_url)) {
      console.error('[tryon] Missing required images');
      return new Response(
        JSON.stringify({ 
          error: 'Both person and outfit images are required',
          code: 'bad_request',
          details: 'Must provide either image IDs or image URLs for both person and outfit'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate resolution (never allow 'low', map to 'standard')
    const validResolution = resolution === 'high' ? 'high' : 'standard';
    if (resolution !== validResolution) {
      console.log('[tryon] Resolution mapped from', resolution, 'to', validResolution);
    }

    // Validate num_images
    const validNumImages = Math.max(1, Math.min(4, num_images));
    if (num_images !== validNumImages) {
      console.log('[tryon] num_images clamped from', num_images, 'to', validNumImages);
    }

    // Create try-on job in database first
    const { data: jobData, error: jobError } = await supabase
      .from('ai_tryon_jobs')
      .insert({
        user_id: user.id,
        person_image_id: person_image_id || null,
        outfit_image_id: outfit_image_id || null,
        resolution: validResolution,
        num_images: validNumImages,
        status: 'pending'
      })
      .select()
      .single();

    if (jobError) {
      console.error('[tryon] Database error:', jobError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create job record',
          details: jobError.message,
          code: 'DATABASE_ERROR'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('[tryon] Created job record:', jobData.id);

    // Build request body for BitStudio API
    const requestBody: any = {
      resolution: validResolution,
      num_images: validNumImages
    };

    // Add image parameters
    if (person_image_id) requestBody.person_image_id = person_image_id;
    if (person_image_url) requestBody.person_image_url = person_image_url;
    if (outfit_image_id) requestBody.outfit_image_id = outfit_image_id;
    if (outfit_image_url) requestBody.outfit_image_url = outfit_image_url;
    if (seed !== undefined) requestBody.seed = seed;
    if (prompt && prompt.trim()) requestBody.prompt = prompt.trim();

    const requestUrl = `${BITSTUDIO_API_BASE}/images/virtual-try-on`;
    
    console.log('[tryon] Request URL:', requestUrl);
    console.log('[tryon] Request headers (auth present):', !!BITSTUDIO_API_KEY);

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BITSTUDIO_API_KEY.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('[tryon] BitStudio response status:', response.status);
    console.log('[tryon] BitStudio response headers:', Object.fromEntries(response.headers.entries()));

    let responseText = '';
    let responseData: any = {};

    try {
      responseText = await response.text();
      console.log('[tryon] BitStudio raw response:', responseText);
      
      try {
        responseData = JSON.parse(responseText);
        console.log('[tryon] BitStudio parsed response:', responseData);
      } catch {
        responseData = { error: responseText, message: responseText };
        console.log('[tryon] BitStudio non-JSON response, wrapped as:', responseData);
      }
    } catch (e) {
      responseText = `HTTP ${response.status}`;
      responseData = { error: responseText, message: responseText };
      console.error('[tryon] Failed to read BitStudio response:', e);
    }

    if (!response.ok) {
      console.error('[tryon] BitStudio API error - Status:', response.status); 
      console.error('[tryon] BitStudio API error - Body:', responseData);
      
      // Update job status to failed
      await supabase
        .from('ai_tryon_jobs')
        .update({ 
          status: 'failed',
          error: { 
            message: responseData.error || responseData.message || 'Unknown error',
            status: response.status,
            bitstudio_error: responseData,
            raw_response: responseText
          }
        })
        .eq('id', jobData.id);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded. Please try again in a moment.',
            code: 'RATE_LIMITED',
            bitstudio_error: responseData,
            raw_response: responseText,
            status: response.status
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
        );
      }

      if (response.status === 400) {
        return new Response(
          JSON.stringify({ 
            error: responseData.error || responseData.message || 'Invalid request parameters',
            code: 'bad_request',
            details: 'Check your image IDs and request parameters',
            bitstudio_error: responseData,
            raw_response: responseText,
            status: response.status
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: responseData.error || responseData.message || `BitStudio API error: ${response.status}`,
          code: 'API_ERROR',
          status: response.status,
          bitstudio_error: responseData,
          raw_response: responseText
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
      );
    }

    console.log('[tryon] BitStudio success response:', responseData);
    
    // Extract job ID from first result (BitStudio returns array)
    const providerJobId = Array.isArray(responseData) && responseData.length > 0 ? responseData[0].id : null;
    
    console.log('[tryon] Extracted provider job ID:', providerJobId);
    
    // Update job with provider job ID
    if (providerJobId) {
      await supabase
        .from('ai_tryon_jobs')
        .update({ 
          provider_job_id: providerJobId,
          status: 'generating'
        })
        .eq('id', jobData.id);
      
      console.log('[tryon] Updated job with provider ID');
    }

    return new Response(
      JSON.stringify({ 
        job_id: jobData.id,
        provider_job_id: providerJobId,
        result: responseData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[tryon] Function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Try-on failed', 
        details: (error as any)?.message,
        code: 'INTERNAL_ERROR',
        stack: (error as any)?.stack
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
