
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

    console.log('[status] API key present:', !!BITSTUDIO_API_KEY);
    console.log('[status] API base URL:', BITSTUDIO_API_BASE);

    if (!BITSTUDIO_API_KEY || BITSTUDIO_API_KEY.trim() === '') {
      console.error('[status] BitStudio API key not configured');
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
      console.error('[status] No authorization header provided');
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
      console.error('[status] Invalid authorization:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const body = await req.json();
    const { id } = body;

    console.log('[status] Checking status for image ID:', id);

    if (!id) {
      console.error('[status] No image ID provided');
      return new Response(
        JSON.stringify({ 
          error: 'Image ID is required',
          code: 'bad_request'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Call BitStudio status API
    const statusUrl = `${BITSTUDIO_API_BASE}/images/${id}`;
    console.log('[status] Calling BitStudio API:', statusUrl);

    const response = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${BITSTUDIO_API_KEY.trim()}`,
      },
    });

    console.log('[status] BitStudio response status:', response.status);

    let responseText = '';
    let responseData: any = {};

    try {
      responseText = await response.text();
      console.log('[status] BitStudio raw response:', responseText.substring(0, 500));
      
      try {
        responseData = JSON.parse(responseText);
        console.log('[status] BitStudio parsed response:', responseData);
      } catch {
        responseData = { error: responseText, message: responseText };
      }
    } catch (e) {
      responseText = `HTTP ${response.status}`;
      responseData = { error: responseText, message: responseText };
      console.error('[status] Failed to read BitStudio response:', e);
    }

    if (response.ok) {
      console.log('[status] Status check successful');
      return new Response(
        JSON.stringify(responseData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle specific error cases
    if (response.status === 404) {
      return new Response(
        JSON.stringify({ 
          error: 'Image not found',
          code: 'not_found',
          bitstudio_error: responseData,
          status: response.status
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          code: 'rate_limited',
          bitstudio_error: responseData,
          status: response.status
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
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
    console.error('[status] Function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Status check failed', 
        details: (error as any)?.message,
        code: 'INTERNAL_ERROR'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
