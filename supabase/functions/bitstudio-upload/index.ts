
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
    
    // Normalize API base to ensure v1 endpoint
    if (!BITSTUDIO_API_BASE.includes('/v1')) {
      BITSTUDIO_API_BASE = BITSTUDIO_API_BASE.replace(/\/+$/, '') + '/v1';
    }

    console.log('Upload function called, API key present:', !!BITSTUDIO_API_KEY);
    console.log('API base URL:', BITSTUDIO_API_BASE);

    if (!BITSTUDIO_API_KEY) {
      console.error('BitStudio API key not configured');
      return new Response(
        JSON.stringify({ 
          error: 'BitStudio API key not configured', 
          code: 'invalid_token',
          details: 'Please configure your BitStudio API key in the project settings'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Get the form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    console.log('Upload request:', { 
      fileName: file?.name, 
      fileSize: file?.size, 
      fileType: file?.type, 
      type: type 
    });

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided', code: 'bad_request' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: 'File size exceeds 10MB limit', code: 'bad_request' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Expanded image type validation - include more formats
    const allowedTypes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'image/webp', 
      'image/gif',
      'image/bmp',
      'image/tiff'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      console.error('Invalid file type:', file.type);
      return new Response(
        JSON.stringify({ 
          error: `Invalid file type: ${file.type}. Supported formats: JPEG, PNG, WebP, GIF, BMP, TIFF`, 
          code: 'bad_request' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate type parameter - extend support for inpainting/edit/video uploads
    const validTypes = [
      'virtual-try-on-person',
      'virtual-try-on-outfit',
      'inpaint-base',
      'inpaint-mask',
      'inpaint-reference',
      'edit',
      'image-to-video'
    ];
    if (!validTypes.includes(type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid type. Must be one of: ' + validTypes.join(', '), code: 'bad_request' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Create form data for bitStudio API with compatibility hedging
    const bitStudioFormData = new FormData();
    bitStudioFormData.append('file', file);
    bitStudioFormData.append('image', file); // Hedge: some APIs expect 'image'
    bitStudioFormData.append('type', type);
    bitStudioFormData.append('image_type', type); // Hedge: some APIs expect 'image_type'

    console.log('Making request to BitStudio API...');

    // Make request to bitStudio API
    const response = await fetch(`${BITSTUDIO_API_BASE}/images`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BITSTUDIO_API_KEY}`,
      },
      body: bitStudioFormData,
    });

    console.log('BitStudio API response status:', response.status);

    if (!response.ok) {
      let errorData;
      let errorText;
      
      try {
        errorText = await response.text();
        console.error('BitStudio API error response:', errorText);
        
        // Try to parse as JSON first
        try {
          errorData = JSON.parse(errorText);
        } catch {
          // If not JSON, create error object from text
          errorData = { error: errorText, code: 'api_error' };
        }
      } catch (e) {
        errorText = `HTTP ${response.status}`;
        errorData = { error: errorText, code: 'api_error' };
      }
      
      // Handle specific error cases with proper codes
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid or expired BitStudio API key', 
            code: 'invalid_token',
            details: 'Please check your BitStudio API key configuration',
            bitstudio_error: errorData
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded. Please try again in a moment.', 
            code: 'RATE_LIMITED',
            bitstudio_error: errorData
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: 'Insufficient credits or subscription required', 
            code: 'insufficient_credits',
            bitstudio_error: errorData
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 402 }
        );
      }

      if (response.status === 400) {
        return new Response(
          JSON.stringify({ 
            error: errorData?.error || 'Invalid request parameters', 
            code: 'bad_request',
            details: errorData?.details || 'Please check your input parameters',
            bitstudio_error: errorData
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      
      // Generic server error
      return new Response(
        JSON.stringify({ 
          error: `BitStudio API error: ${response.status}`, 
          code: 'api_error',
          details: errorData?.error || errorText,
          bitstudio_error: errorData
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
      );
    }

    const result = await response.json();
    console.log('BitStudio API success response:', result);
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Upload function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Upload failed', 
        code: 'upload_error',
        details: (error as any)?.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
