
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
      model: "gpt-4.1-mini with image_generation",
      hasKey: !!openAIApiKey,
      apiType: "Responses API"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let requestBody: any = null;
  
  try {
    // Parse request body once at the beginning
    requestBody = await req.json();
    const { toyReplicaId, sourceUrl } = requestBody;

    if (!toyReplicaId || !sourceUrl) {
      throw new Error('Missing required parameters: toyReplicaId and sourceUrl');
    }

    console.log('Processing toy replica generation:', { toyReplicaId, sourceUrl });

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

    // Convert image to data URL format
    const imageBuffer = await imageData.arrayBuffer();
    const imageBase64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
    
    // Get content type from the file extension or default to jpeg
    const fileExt = sourceUrl.split('.').pop()?.toLowerCase();
    const contentType = fileExt === 'png' ? 'image/png' : 
                       fileExt === 'webp' ? 'image/webp' : 'image/jpeg';
    const dataUrl = `data:${contentType};base64,${imageBase64}`;

    // The embedded LEGO generation prompt
    const prompt = `Create a LEGO mini-figure version of the person in the uploaded photo, wearing the exact same outfit, accessories, and hairstyle. Replicate all clothing details, patterns, and colors exactly, including any printed text on clothing, denim styles, jewelry, headwear, phone case designs, handbags, or boots. The LEGO figure should mimic the identical facial expression, stance, and pose as the person in the image, while holding the same objects in the same way. Maintain realistic LEGO proportions and brick-like textures while ensuring accurate color matching to the original photo. Render with a transparent background and no shadows so it can be used in various layouts. The style should be consistent with authentic LEGO mini-figure aesthetics.`;

    console.log('Calling OpenAI Responses API...');

    // Call OpenAI Responses API with image_generation tool
    const openAIResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: prompt },
              { type: 'input_image', image_url: dataUrl }
            ]
          }
        ],
        tools: [{ type: 'image_generation' }]
      }),
    });

    console.log('OpenAI Responses API status:', openAIResponse.status);

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI Responses API error:', errorText);
      throw new Error(`OpenAI Responses API error: ${openAIResponse.status} ${errorText}`);
    }

    const openAIResult = await openAIResponse.json();
    console.log('OpenAI response received, output length:', openAIResult.output?.length || 0);

    // Extract the generated image from image_generation_call outputs
    const imageCalls = openAIResult.output?.filter(
      (o: any) => o.type === 'image_generation_call'
    ) || [];

    if (!imageCalls.length) {
      console.error('No image_generation_call found in response:', openAIResult);
      throw new Error('No image was generated by the Responses API');
    }

    const resultImageBase64 = imageCalls[0].result;
    if (!resultImageBase64) {
      console.error('No result in image_generation_call:', imageCalls[0]);
      throw new Error('Generated image result is empty');
    }

    // Convert base64 result to blob
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
    if (requestBody?.toyReplicaId) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase
          .from('toy_replicas')
          .update({ 
            status: 'failed',
            error: error.message
          })
          .eq('id', requestBody.toyReplicaId);
      } catch (dbError) {
        console.error('Failed to update error status:', dbError);
      }
    }

    return new Response(JSON.stringify({ 
      error: error.message || 'An unexpected error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
