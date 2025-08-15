
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  
  // Health endpoint
  if (req.method === 'GET') {
    return new Response(JSON.stringify({
      ok: true,
      model: "gpt-image-1",
      hasKey: !!openAIApiKey
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { toyReplicaId, sourceUrl } = await req.json();

    if (!toyReplicaId || !sourceUrl) {
      throw new Error('Missing required parameters');
    }

    console.log('Processing toy replica generation:', { toyReplicaId, sourceUrl });

    // Update status to processing
    await supabase
      .from('toy_replicas')
      .update({ status: 'processing' })
      .eq('id', toyReplicaId)
      .eq('user_id', user.id);

    // Download the source image from Supabase storage
    const { data: imageData, error: downloadError } = await supabase.storage
      .from('toy-replica-source')
      .download(sourceUrl);

    if (downloadError) {
      throw new Error(`Failed to download source image: ${downloadError.message}`);
    }

    // Convert image to base64
    const imageBuffer = await imageData.arrayBuffer();
    const imageBase64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

    // The embedded LEGO generation prompt
    const prompt = `Create a LEGO mini-figure version of the person in the uploaded photo, wearing the exact same outfit, accessories, and hairstyle. Replicate all clothing details, patterns, and colors exactly, including any printed text on clothing, denim styles, jewelry, headwear, phone case designs, handbags, or boots. The LEGO figure should mimic the identical facial expression, stance, and pose as the person in the image, while holding the same objects in the same way. Maintain realistic LEGO proportions and brick-like textures while ensuring accurate color matching to the original photo. Render with a transparent background and no shadows so it can be used in various layouts. The style should be consistent with authentic LEGO mini-figure aesthetics.`;

    console.log('Calling OpenAI API...');

    // Call OpenAI API using the correct endpoint for gpt-image-1
    const openAIResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: prompt,
        size: '1024x1024',
        background: 'transparent',
        output_format: 'png',
        image: imageBase64
      }),
    });

    console.log('OpenAI response status:', openAIResponse.status);

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openAIResponse.status} ${errorText}`);
    }

    const openAIResult = await openAIResponse.json();
    console.log('OpenAI response received');

    if (!openAIResult.data || !openAIResult.data[0] || !openAIResult.data[0].b64_json) {
      throw new Error('Invalid response from OpenAI API - missing b64_json data');
    }

    // Convert base64 result to blob
    const resultImageBase64 = openAIResult.data[0].b64_json;
    const resultImageBuffer = Uint8Array.from(atob(resultImageBase64), c => c.charCodeAt(0));

    // Generate unique filename for result
    const timestamp = Date.now();
    const resultFileName = `${user.id}/${toyReplicaId}-${timestamp}.png`;
    
    console.log('Uploading result to:', resultFileName);
    
    // Upload result to toy-replica-result bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('toy-replica-result')
      .upload(resultFileName, resultImageBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload result: ${uploadError.message}`);
    }

    // Get public URL for the result
    const { data: publicUrlData } = supabase.storage
      .from('toy-replica-result')
      .getPublicUrl(resultFileName);

    const resultUrl = publicUrlData.publicUrl;

    // Update database with success
    await supabase
      .from('toy_replicas')
      .update({ 
        status: 'succeeded',
        result_url: resultUrl
      })
      .eq('id', toyReplicaId)
      .eq('user_id', user.id);

    console.log('Toy replica generation completed successfully');

    return new Response(JSON.stringify({ 
      success: true,
      result_url: resultUrl
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-toy-replica function:', error);
    
    // Try to update database with error status if we have the toyReplicaId
    try {
      const body = await req.json();
      const { toyReplicaId } = body;
      if (toyReplicaId) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase
          .from('toy_replicas')
          .update({ 
            status: 'failed',
            error: error.message
          })
          .eq('id', toyReplicaId);
      }
    } catch (dbError) {
      console.error('Failed to update error status:', dbError);
    }

    return new Response(JSON.stringify({ 
      error: error.message || 'An unexpected error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
