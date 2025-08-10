
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Exact valid types per BitStudio API docs
const VALID_TYPES = [
  'virtual-try-on-person',
  'virtual-try-on-outfit',
  'inpaint-base',
  'inpaint-mask', 
  'inpaint-reference',
  'edit',
  'image-to-video'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BITSTUDIO_API_KEY = Deno.env.get('BITSTUDIO_API_KEY');
    let BITSTUDIO_API_BASE = Deno.env.get('BITSTUDIO_API_BASE') || 'https://api.bitstudio.ai';
    
    // Remove any trailing slashes and /v1 - BitStudio API doesn't use /v1
    BITSTUDIO_API_BASE = BITSTUDIO_API_BASE.replace(/\/+$/, '').replace(/\/v1$/, '');

    console.log('[upload] API key present:', !!BITSTUDIO_API_KEY);
    console.log('[upload] API base URL:', BITSTUDIO_API_BASE);

    if (!BITSTUDIO_API_KEY) {
      console.error('[upload] BitStudio API key not configured');
      return new Response(
        JSON.stringify({ 
          error: 'BitStudio API key not configured', 
          code: 'invalid_token',
          details: 'Please configure your BitStudio API key in the project settings'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const typeRaw = formData.get('type') as string;
    
    // Clean and validate type
    const type = String(typeRaw || '').trim();
    
    console.log('[upload] Request details:', { 
      fileName: file?.name, 
      fileSize: file?.size, 
      fileType: file?.type, 
      typeRaw: JSON.stringify(typeRaw),
      typeCleaned: JSON.stringify(type),
      validTypes: VALID_TYPES
    });

    if (!file) {
      console.error('[upload] No file provided');
      return new Response(
        JSON.stringify({ error: 'No file provided', code: 'bad_request' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      console.error('[upload] File size exceeds limit:', file.size);
      return new Response(
        JSON.stringify({ error: 'File size exceeds 10MB limit', code: 'bad_request' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Expanded image type validation
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
      console.error('[upload] Invalid file type:', file.type);
      return new Response(
        JSON.stringify({ 
          error: `Invalid file type: ${file.type}. Supported formats: JPEG, PNG, WebP, GIF, BMP, TIFF`, 
          code: 'bad_request' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate type parameter against exact allowed values
    if (!VALID_TYPES.includes(type)) {
      console.error('[upload] Invalid type provided:', JSON.stringify(type));
      return new Response(
        JSON.stringify({ 
          error: `Invalid type: "${type}". Must be one of: ${VALID_TYPES.join(', ')}`, 
          code: 'bad_request',
          details: 'Type validation failed - check exact spelling and hyphens'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('[upload] Validation passed, creating FormData for BitStudio');

    // Create form data for BitStudio API - preserve exact structure
    const bitStudioFormData = new FormData();
    bitStudioFormData.append('file', file, file.name || 'upload.png');
    bitStudioFormData.append('type', type);

    const requestUrl = `${BITSTUDIO_API_BASE}/images`;
    console.log('[upload] Making request to:', requestUrl);
    console.log('[upload] Request headers (minus key):', { 'Content-Type': 'multipart/form-data' });
    console.log('[upload] Request body fields:', { file: `${file.name} (${file.size} bytes)`, type });

    // Make request to BitStudio API
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BITSTUDIO_API_KEY}`,
        // Don't set Content-Type - let FormData set boundary
      },
      body: bitStudioFormData,
    });

    console.log('[upload] BitStudio response status:', response.status);
    console.log('[upload] BitStudio response headers:', Object.fromEntries(response.headers.entries()));

    let responseText = '';
    let errorData: any = {};
    
    try {
      responseText = await response.text();
      console.log('[upload] BitStudio raw response:', responseText);
      
      // Try to parse as JSON
      try {
        errorData = JSON.parse(responseText);
        console.log('[upload] BitStudio parsed response:', errorData);
      } catch {
        // If not JSON, create error object from text
        errorData = { error: responseText, code: 'api_error' };
        console.log('[upload] BitStudio non-JSON response, wrapped as:', errorData);
      }
    } catch (e) {
      responseText = `HTTP ${response.status}`;
      errorData = { error: responseText, code: 'api_error' };
      console.error('[upload] Failed to read BitStudio response:', e);
    }

    if (!response.ok) {
      console.error('[upload] BitStudio API error - Status:', response.status);
      console.error('[upload] BitStudio API error - Body:', errorData);
      
      // Handle specific error cases with proper codes
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid or expired BitStudio API key', 
            code: 'invalid_token',
            details: 'Please check your BitStudio API key configuration',
            bitstudio_error: errorData,
            raw_response: responseText,
            status: response.status
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded. Please try again in a moment.', 
            code: 'RATE_LIMITED',
            bitstudio_error: errorData,
            raw_response: responseText,
            status: response.status
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: 'Insufficient credits or subscription required', 
            code: 'insufficient_credits',
            bitstudio_error: errorData,
            raw_response: responseText,
            status: response.status
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
            bitstudio_error: errorData,
            raw_response: responseText,
            status: response.status
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      
      // Generic server error
      return new Response(
        JSON.stringify({ 
          error: `BitStudio API error: ${response.status}`, 
          code: 'api_error',
          details: errorData?.error || responseText,
          bitstudio_error: errorData,
          raw_response: responseText,
          status: response.status
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
      );
    }

    console.log('[upload] BitStudio API success response:', errorData);
    
    return new Response(
      JSON.stringify(errorData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[upload] Function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Upload failed', 
        code: 'upload_error',
        details: (error as any)?.message,
        stack: (error as any)?.stack
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
