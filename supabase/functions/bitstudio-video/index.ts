
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
      throw new Error('bitStudio API key not configured');
    }

    const { id, ...params } = await req.json();
    
    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Image ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Remove undefined values
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== undefined)
    );

    const response = await fetch(`${BITSTUDIO_API_BASE}/images/${id}/video`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BITSTUDIO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cleanParams),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('bitStudio API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
        );
      }
      
      throw new Error(`bitStudio API error: ${response.status}`);
    }

    const result = await response.json();
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Video generation error:', error);
    return new Response(
      JSON.stringify({ error: 'Video generation failed', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
