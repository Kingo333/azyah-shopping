import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { toyReplicaId } = await req.json();
    if (!toyReplicaId) {
      return new Response(
        JSON.stringify({ error: 'Missing toyReplicaId' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🎯 Generating LEGO toy replica for ID:', toyReplicaId);

    // Update status to processing
    await supabase
      .from('toy_replicas')
      .update({ status: 'processing' })
      .eq('id', toyReplicaId);

    // Get the source file info
    const { data: toyReplica, error: fetchError } = await supabase
      .from('toy_replicas')
      .select('*')
      .eq('id', toyReplicaId)
      .single();

    if (fetchError || !toyReplica || !toyReplica.source_url) {
      console.error('❌ Toy replica not found:', fetchError);
      await supabase
        .from('toy_replicas')
        .update({ 
          status: 'failed', 
          error: 'Source image not found' 
        })
        .eq('id', toyReplicaId);
      
      return new Response(
        JSON.stringify({ error: 'Toy replica not found or missing source image' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📥 Downloading source image from:', toyReplica.source_url);

    // Get signed URL for the source image
    const { data: signedUrlData } = await supabase.storage
      .from('toy-replica-source')
      .createSignedUrl(toyReplica.source_url, 60);

    if (!signedUrlData?.signedUrl) {
      throw new Error('Failed to get source image URL');
    }

    // Download and convert to base64
    const imageResponse = await fetch(signedUrlData.signedUrl);
    const imageBlob = await imageResponse.blob();
    const arrayBuffer = await imageBlob.arrayBuffer();
    
    // Convert array buffer to base64 in chunks to avoid stack overflow
    const uint8Array = new Uint8Array(arrayBuffer);
    let binaryString = '';
    const chunkSize = 0x8000; // 32KB chunks
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binaryString += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const base64Image = btoa(binaryString);
    const imageDataUrl = `data:${imageBlob.type};base64,${base64Image}`;

    console.log('🤖 Calling OpenAI to generate LEGO mini-figure...');

    // Call OpenAI chat completions with vision and image generation
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Transform this person into a LEGO mini-figure character with transparent background. The mini-figure should have: Classic LEGO mini-figure proportions and style, cylindrical head with printed facial features, block-shaped torso and arms, short legs typical of LEGO mini-figures. Maintain the person\'s key characteristics (hair color, style, clothing colors). Professional toy-like appearance with clean transparent background and high quality render.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageDataUrl
                }
              }
            ]
          }
        ],
        modalities: ['image', 'text'],
        background: 'transparent',
        output_format: 'png',
        quality: 'high'
      }),
    });

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.text();
      console.error('❌ OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData}`);
    }

    const openAIData = await openAIResponse.json();
    console.log('✅ OpenAI generation successful');

    // Extract the base64 image from the response
    const generatedImage = openAIData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!generatedImage) {
      throw new Error('No image data returned from OpenAI');
    }

    // Extract base64 data (remove data:image/png;base64, prefix if present)
    const base64Match = generatedImage.match(/base64,(.+)/);
    const generatedImageBase64 = base64Match ? base64Match[1] : generatedImage;

    // Convert base64 to blob
    const binaryString = atob(generatedImageBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const resultBlob = new Blob([bytes], { type: 'image/png' });

    // Upload the result
    const resultPath = `results/${toyReplica.user_id}/${toyReplicaId}.png`;
    console.log('📤 Uploading LEGO mini-figure to:', resultPath);

    const { error: uploadError } = await supabase.storage
      .from('toy-replica-result')
      .upload(resultPath, resultBlob, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Upload failed:', uploadError);
      throw new Error('Failed to upload result image');
    }

    console.log('✅ Result uploaded successfully');

    // Update the record with success
    const { error: updateError } = await supabase
      .from('toy_replicas')
      .update({ 
        result_url: resultPath,
        status: 'succeeded',
        error: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', toyReplicaId);

    if (updateError) {
      console.error('❌ Failed to update record:', updateError);
      throw new Error('Failed to update toy replica');
    }

    console.log('🎉 LEGO mini-figure generation completed successfully!');

    return new Response(
      JSON.stringify({ 
        success: true,
        resultUrl: resultPath,
        toyReplicaId: toyReplicaId
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Generation failed'
      }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});