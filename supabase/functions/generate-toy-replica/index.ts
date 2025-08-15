
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
      model: "gpt-4o vision + gpt-image-1",
      hasKey: !!openAIApiKey,
      apiType: "Two-step: Vision Analysis + Image Generation"
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

    console.log('Step 1: Analyzing image with GPT-4 Vision...');

    // Step 1: Use GPT-4 Vision to analyze the image and create a detailed LEGO prompt
    const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this photo and create a detailed description for generating a LEGO mini-figure version. Focus on: clothing (colors, patterns, style, text), hairstyle and color, facial expression, pose and stance, accessories (jewelry, bags, hats, etc.), and any objects being held. Be very specific about colors, materials, and details so a LEGO mini-figure can be accurately created. The description should be detailed enough for image generation.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: dataUrl
                }
              }
            ]
          }
        ],
        max_tokens: 500
      }),
    });

    console.log('Vision API status:', visionResponse.status);

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error('Vision API error:', errorText);
      throw new Error(`Vision analysis failed: ${visionResponse.status} ${errorText}`);
    }

    const visionResult = await visionResponse.json();
    const analysisText = visionResult.choices?.[0]?.message?.content;

    if (!analysisText) {
      throw new Error('Failed to get image analysis from Vision API');
    }

    console.log('Step 2: Generating LEGO image based on analysis...');

    // Step 2: Create the final LEGO generation prompt
    const legoPrompt = `Create a LEGO mini-figure based on this description: ${analysisText}

Additional requirements:
- Use authentic LEGO mini-figure proportions and brick-like textures
- Maintain the exact clothing details, colors, and patterns described
- Keep the same facial expression, pose, and stance
- Include all accessories and objects mentioned
- Render with a transparent background and no shadows
- Style should be consistent with official LEGO mini-figures
- Ensure accurate color matching to the original description`;

    // Step 2: Generate the LEGO image using the Images API
    const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
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

    console.log('Image Generation API status:', imageResponse.status);

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error('Image Generation API error:', errorText);
      throw new Error(`Image generation failed: ${imageResponse.status} ${errorText}`);
    }

    const imageResult = await imageResponse.json();
    console.log('Image generation completed');

    // Extract the generated image
    if (!imageResult.data || !imageResult.data[0] || !imageResult.data[0].b64_json) {
      console.error('Invalid image generation response:', imageResult);
      throw new Error('No image was generated by the Images API');
    }

    const resultImageBase64 = imageResult.data[0].b64_json;

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
