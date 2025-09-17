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

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file || !type) {
      return new Response(
        JSON.stringify({ error: 'Missing file or type parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create FormData for BitStudio API
    const bitStudioFormData = new FormData();
    bitStudioFormData.append('file', file);
    bitStudioFormData.append('type', type);

    console.log('Uploading to BitStudio API:', { fileName: file.name, type, size: file.size });

    // Call actual BitStudio API
    const response = await fetch('https://api.bitstudio.ai/v1/images', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bitStudioApiKey}`,
      },
      body: bitStudioFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('BitStudio API error:', response.status, errorText);
      throw new Error(`BitStudio API error: ${response.status} - ${errorText}`);
    }

    const bitStudioResponse = await response.json();
    console.log('BitStudio upload response:', bitStudioResponse);

    // Map BitStudio response to our expected format
    const mappedResponse = {
      id: bitStudioResponse.id || bitStudioResponse.image_id,
      type: type,
      status: bitStudioResponse.status || 'completed',
      path: bitStudioResponse.url || bitStudioResponse.path,
      credits_used: bitStudioResponse.credits_used || 0
    };

    return new Response(
      JSON.stringify(mappedResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Upload failed', 
        details: error.message,
        bitstudio_error: error.cause || null
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});