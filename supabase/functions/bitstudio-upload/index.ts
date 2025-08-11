
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
    BITSTUDIO_API_BASE = BITSTUDIO_API_BASE.replace(/\/+$/, '');

    console.log('[upload] API key present:', !!BITSTUDIO_API_KEY);
    console.log('[upload] API base URL:', BITSTUDIO_API_BASE);

    if (!BITSTUDIO_API_KEY || BITSTUDIO_API_KEY.trim() === '') {
      console.error('[upload] BitStudio API key not configured');
      return new Response(
        JSON.stringify({ 
          error: 'BitStudio API key not configured',
          code: 'MISSING_API_KEY'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Get user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[upload] No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
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
      console.error('[upload] Invalid authorization:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log('[upload] User authenticated:', user.id);

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    console.log('[upload] Form data received:', {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      typeParam: type,
      user_id: user.id
    });

    if (!file) {
      console.error('[upload] No file provided');
      return new Response(
        JSON.stringify({ 
          error: 'No file provided',
          code: 'bad_request'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!type) {
      console.error('[upload] No type provided');
      return new Response(
        JSON.stringify({ 
          error: 'No type provided',
          code: 'bad_request'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate type
    const validTypes = ['virtual-try-on-person', 'virtual-try-on-outfit'];
    if (!validTypes.includes(type)) {
      console.error('[upload] Invalid type:', type);
      return new Response(
        JSON.stringify({ 
          error: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
          code: 'bad_request'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      console.error('[upload] File size exceeds limit:', file.size);
      return new Response(
        JSON.stringify({ 
          error: 'File size exceeds 10MB limit',
          code: 'bad_request'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      console.error('[upload] Invalid file type:', file.type);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.',
          code: 'bad_request'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Create FormData for BitStudio API
    const bitStudioFormData = new FormData();
    bitStudioFormData.append('file', file);
    bitStudioFormData.append('type', type);

    // Call the correct BitStudio API endpoint
    const uploadUrl = `${BITSTUDIO_API_BASE}/images`;
    console.log('[upload] Calling BitStudio API:', uploadUrl);

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BITSTUDIO_API_KEY.trim()}`,
        // Don't set Content-Type - let FormData set the boundary
      },
      body: bitStudioFormData,
    });

    console.log('[upload] BitStudio response status:', response.status);

    let responseText = '';
    let responseData: any = {};

    try {
      responseText = await response.text();
      console.log('[upload] BitStudio raw response:', responseText.substring(0, 500));
      
      try {
        responseData = JSON.parse(responseText);
        console.log('[upload] BitStudio parsed response:', responseData);
      } catch {
        responseData = { error: responseText, message: responseText };
      }
    } catch (e) {
      responseText = `HTTP ${response.status}`;
      responseData = { error: responseText, message: responseText };
      console.error('[upload] Failed to read BitStudio response:', e);
    }

    if (response.ok) {
      console.log('[upload] Upload successful');
      return new Response(
        JSON.stringify(responseData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle specific error cases
    if (response.status === 401) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid API key or unauthorized access',
          code: 'unauthorized',
          bitstudio_error: responseData,
          status: response.status
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    if (response.status === 400) {
      return new Response(
        JSON.stringify({ 
          error: responseData.error || responseData.message || 'Invalid request parameters',
          code: 'bad_request',
          details: 'Check your file and type parameters',
          bitstudio_error: responseData,
          status: response.status
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Generic error
    return new Response(
      JSON.stringify({ 
        error: responseData.error || responseData.message || `BitStudio API error: ${response.status}`,
        code: 'API_ERROR',
        status: response.status,
        bitstudio_error: responseData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
    );

  } catch (error) {
    console.error('[upload] Function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Upload failed', 
        details: (error as any)?.message,
        code: 'INTERNAL_ERROR'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
