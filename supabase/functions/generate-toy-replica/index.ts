
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const LEGO_PROMPT = `Create a LEGO mini-figure version of the person in the uploaded photo, wearing the exact same outfit, accessories, and hairstyle. Replicate all clothing details, patterns, and colors exactly, including any printed text on clothing, denim styles, jewelry, headwear, phone case designs, handbags, or boots. The LEGO figure should mimic the identical facial expression, stance, and pose as the person in the image, while holding the same objects in the same way. Maintain realistic LEGO proportions and brick-like textures while ensuring accurate color matching to the original photo. Render with a transparent background and no shadows so it can be used in various layouts. The style should be consistent with authentic LEGO mini-figure aesthetics.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { toyReplicaId, sourceUrl } = await req.json();
    
    if (!toyReplicaId || !sourceUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing toyReplicaId or sourceUrl' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing toy replica:', toyReplicaId);
    
    // Update status to processing
    await supabase
      .from('toy_replicas')
      .update({ status: 'processing' })
      .eq('id', toyReplicaId);

    // Get the source image from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('toy-replica-source')
      .download(sourceUrl);

    if (downloadError) {
      console.error('Download error:', downloadError);
      await supabase
        .from('toy_replicas')
        .update({ status: 'failed', error: 'Failed to download source image' })
        .eq('id', toyReplicaId);
      
      return new Response(
        JSON.stringify({ error: 'Failed to download source image' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const imageBase64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    console.log('Calling OpenAI API...');
    
    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: LEGO_PROMPT,
        size: '1024x1024',
        background: 'transparent',
        image: imageBase64,
        output_format: 'png'
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      
      await supabase
        .from('toy_replicas')
        .update({ 
          status: 'failed', 
          error: `OpenAI API error: ${openaiResponse.status}` 
        })
        .eq('id', toyReplicaId);
      
      return new Response(
        JSON.stringify({ error: 'OpenAI API error', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await openaiResponse.json();
    
    if (!result.data || !result.data[0] || !result.data[0].b64_json) {
      console.error('Invalid OpenAI response:', result);
      await supabase
        .from('toy_replicas')
        .update({ status: 'failed', error: 'Invalid response from OpenAI' })
        .eq('id', toyReplicaId);
      
      return new Response(
        JSON.stringify({ error: 'Invalid response from OpenAI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert base64 to blob
    const imageBuffer = Uint8Array.from(atob(result.data[0].b64_json), c => c.charCodeAt(0));
    
    // Upload result to storage
    const resultFileName = `${toyReplicaId}-result.png`;
    const { error: uploadError } = await supabase.storage
      .from('toy-replica-result')
      .upload(resultFileName, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      await supabase
        .from('toy_replicas')
        .update({ status: 'failed', error: 'Failed to upload result' })
        .eq('id', toyReplicaId);
      
      return new Response(
        JSON.stringify({ error: 'Failed to upload result' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL for result
    const { data: { publicUrl } } = supabase.storage
      .from('toy-replica-result')
      .getPublicUrl(resultFileName);

    // Update database with result
    const { error: updateError } = await supabase
      .from('toy_replicas')
      .update({ 
        status: 'succeeded', 
        result_url: publicUrl 
      })
      .eq('id', toyReplicaId);

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update database' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Toy replica generated successfully:', publicUrl);

    return new Response(
      JSON.stringify({ 
        success: true, 
        resultUrl: publicUrl,
        toyReplicaId 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
