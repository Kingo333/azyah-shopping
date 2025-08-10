
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
      throw new Error('BitStudio API key not configured');
    }

    // Accept POST requests with JSON body containing the image ID
    const { id } = await req.json();
    
    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Image ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Checking status for image ID:', id);

    const response = await fetch(`${BITSTUDIO_API_BASE}/images/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${BITSTUDIO_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('BitStudio API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded. Please try again in a moment.',
            code: 'RATE_LIMITED'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
        );
      }
      
      if (response.status === 404) {
        return new Response(
          JSON.stringify({ 
            error: 'Image not found',
            code: 'not_found'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }
      
      throw new Error(`BitStudio API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('Status check result:', result);
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Status check error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Status check failed', 
        code: 'status_error',
        details: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
