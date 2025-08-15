
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const { toyReplicaId, sourceUrl, prompt } = await req.json();

    if (!toyReplicaId || !sourceUrl) {
      throw new Error('toyReplicaId and sourceUrl are required');
    }

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Starting toy replica generation for user:', user.id);

    // Update status to processing
    await supabase
      .from('toy_replicas')
      .update({ status: 'processing' })
      .eq('id', toyReplicaId)
      .eq('user_id', user.id);

    // Download the source image from Supabase storage
    console.log('Downloading source image from:', sourceUrl);
    const { data: imageData, error: downloadError } = await supabase.storage
      .from('toy-replica-source')
      .download(sourceUrl);

    if (downloadError) {
      throw new Error(`Failed to download source image: ${downloadError.message}`);
    }

    // Convert image to base64
    const arrayBuffer = await imageData.arrayBuffer();
    const imageBase64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Embedded LEGO generation prompt
    const legoPrompt = `Create a LEGO mini-figure version of the person in the uploaded photo, wearing the exact same outfit, accessories, and hairstyle. Replicate all clothing details, patterns, and colors exactly, including any printed text on clothing, denim styles, jewelry, headwear, phone case designs, handbags, or boots. The LEGO figure should mimic the identical facial expression, stance, and pose as the person in the image, while holding the same objects in the same way. Maintain realistic LEGO proportions and brick-like textures while ensuring accurate color matching to the original photo. Render with a transparent background and no shadows so it can be used in various layouts. The style should be consistent with authentic LEGO mini-figure aesthetics.`;

    console.log('Calling OpenAI API with gpt-image-1 model');

    // Call OpenAI Images API
    const openAIResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: legoPrompt,
        size: '1024x1024',
        background: 'transparent',
        output_format: 'png',
        quality: 'high',
        n: 1
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', openAIResponse.status, errorText);
      throw new Error(`OpenAI API error: ${openAIResponse.status} ${errorText}`);
    }

    const openAIResult = await openAIResponse.json();
    console.log('OpenAI response received');

    // For gpt-image-1, the response format is always base64
    const generatedImageBase64 = openAIResult.data[0].b64_json;
    if (!generatedImageBase64) {
      throw new Error('No image data received from OpenAI');
    }

    // Convert base64 to blob for upload
    const imageBuffer = Uint8Array.from(atob(generatedImageBase64), c => c.charCodeAt(0));

    // Upload result to public bucket
    const resultFileName = `lego-${toyReplicaId}-${Date.now()}.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('toy-replica-result')
      .upload(resultFileName, imageBuffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload result: ${uploadError.message}`);
    }

    // Get public URL for the result
    const { data: { publicUrl } } = supabase.storage
      .from('toy-replica-result')
      .getPublicUrl(resultFileName);

    console.log('Result uploaded to:', publicUrl);

    // Update database with success
    const { error: updateError } = await supabase
      .from('toy_replicas')
      .update({ 
        status: 'succeeded',
        result_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', toyReplicaId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error(`Failed to update database: ${updateError.message}`);
    }

    return new Response(JSON.stringify({ 
      success: true,
      result_url: publicUrl,
      message: 'LEGO mini-figure generated successfully!'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-toy-replica function:', error);

    // Try to update database with error status if we have the required info
    try {
      const body = await req.json().catch(() => ({}));
      if (body.toyReplicaId) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase
          .from('toy_replicas')
          .update({ 
            status: 'failed',
            error: error.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', body.toyReplicaId);
      }
    } catch (dbError) {
      console.error('Failed to update error status:', dbError);
    }

    return new Response(JSON.stringify({ 
      error: error.message || 'An unexpected error occurred',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
