import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_RETRIES = 3;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate all required environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL is not configured');
    }
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
    }
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { toyReplicaId } = await req.json();
    if (!toyReplicaId) {
      console.error('❌ Missing toyReplicaId in request');
      return new Response(
        JSON.stringify({ error: 'Missing toyReplicaId' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🎯 Starting LEGO toy replica generation for ID:', toyReplicaId);

    // Fetch the toy replica record
    const { data: toyReplica, error: fetchError } = await supabase
      .from('toy_replicas')
      .select('*')
      .eq('id', toyReplicaId)
      .single();

    if (fetchError || !toyReplica) {
      console.error('❌ Toy replica record not found:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Toy replica not found' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!toyReplica.source_url) {
      console.error('❌ Source URL missing for replica:', toyReplicaId);
      await supabase
        .from('toy_replicas')
        .update({ 
          status: 'failed', 
          error: 'Source image URL is missing' 
        })
        .eq('id', toyReplicaId);
      
      return new Response(
        JSON.stringify({ error: 'Source image not found' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check retry count
    if (toyReplica.retry_count >= MAX_RETRIES) {
      console.error('❌ Max retries exceeded for replica:', toyReplicaId);
      await supabase
        .from('toy_replicas')
        .update({ 
          status: 'failed', 
          error: 'Maximum retry attempts exceeded'
        })
        .eq('id', toyReplicaId);
      
      return new Response(
        JSON.stringify({ error: 'Maximum retry attempts exceeded' }), 
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update status to processing
    console.log('📝 Updating status to processing');
    await supabase
      .from('toy_replicas')
      .update({ 
        status: 'processing',
        error: null // Clear any previous errors
      })
      .eq('id', toyReplicaId);

    console.log('📥 Downloading source image from storage:', toyReplica.source_url);

    // Get signed URL for the source image
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('toy-replica-source')
      .createSignedUrl(toyReplica.source_url, 60);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error('❌ Failed to create signed URL:', signedUrlError);
      throw new Error('Failed to access source image from storage');
    }

    console.log('⬇️ Fetching image from signed URL');
    const imageResponse = await fetch(signedUrlData.signedUrl);
    
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.statusText}`);
    }

    const imageBlob = await imageResponse.blob();
    const arrayBuffer = await imageBlob.arrayBuffer();
    
    // Validate image size
    if (arrayBuffer.byteLength > MAX_IMAGE_SIZE) {
      console.error('❌ Image exceeds size limit:', arrayBuffer.byteLength);
      throw new Error('Image exceeds 10MB size limit');
    }

    console.log('✅ Image downloaded successfully, size:', (arrayBuffer.byteLength / 1024 / 1024).toFixed(2), 'MB');
    
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

    console.log('🤖 Calling OpenAI gpt-image-1 to generate LEGO mini-figure...');

    // Call OpenAI with proper timeout and error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    try {
      const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
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

      clearTimeout(timeoutId);

      if (!openAIResponse.ok) {
        const errorData = await openAIResponse.text();
        console.error('❌ OpenAI API error (status ' + openAIResponse.status + '):', errorData);
        
        let errorMessage = 'OpenAI API request failed';
        try {
          const parsedError = JSON.parse(errorData);
          errorMessage = parsedError.error?.message || errorMessage;
        } catch (e) {
          errorMessage = errorData.substring(0, 200);
        }
        
        throw new Error(errorMessage);
      }

      const openAIData = await openAIResponse.json();
      console.log('✅ OpenAI generation successful');

      // Extract the base64 image from the response with fallback paths
      const generatedImage = openAIData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!generatedImage) {
        console.error('❌ No image data in OpenAI response:', JSON.stringify(openAIData));
        throw new Error('No image data returned from OpenAI');
      }

      console.log('🖼️ Extracting base64 image data');
      // Extract base64 data (remove data:image/png;base64, prefix if present)
      const base64Match = generatedImage.match(/base64,(.+)/);
      const generatedImageBase64 = base64Match ? base64Match[1] : generatedImage;

      // Convert base64 to blob
      console.log('🔄 Converting base64 to blob');
      const binaryString = atob(generatedImageBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const resultBlob = new Blob([bytes], { type: 'image/png' });
      console.log('✅ Blob created, size:', (resultBlob.size / 1024).toFixed(2), 'KB');

      // Upload the result
      const resultPath = `results/${toyReplica.user_id}/${toyReplicaId}.png`;
      console.log('📤 Uploading LEGO mini-figure to storage:', resultPath);

      const { error: uploadError } = await supabase.storage
        .from('toy-replica-result')
        .upload(resultPath, resultBlob, {
          contentType: 'image/png',
          upsert: true
        });

      if (uploadError) {
        console.error('❌ Storage upload failed:', uploadError);
        throw new Error(`Failed to upload result image: ${uploadError.message}`);
      }

      console.log('✅ Result uploaded successfully to storage');

      // Update the record with success
      console.log('💾 Updating database record with success status');
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
        console.error('❌ Failed to update database record:', updateError);
        throw new Error(`Failed to update toy replica: ${updateError.message}`);
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

    } catch (timeoutOrOpenAIError) {
      clearTimeout(timeoutId);
      console.error('❌ OpenAI request error:', timeoutOrOpenAIError);
      throw timeoutOrOpenAIError;
    }

  } catch (error) {
    console.error('❌ Fatal error during generation:', error);
    
    // Try to update the record with failure status and retry logic
    try {
      const { toyReplicaId } = await req.json();
      if (toyReplicaId) {
        // Get current retry count
        const { data: currentReplica } = await supabase
          .from('toy_replicas')
          .select('retry_count')
          .eq('id', toyReplicaId)
          .single();

        const currentRetryCount = currentReplica?.retry_count || 0;
        const newRetryCount = currentRetryCount + 1;

        // Determine if we should allow retry
        const shouldRetry = newRetryCount < MAX_RETRIES;
        const finalStatus = shouldRetry ? 'queued' : 'failed';

        await supabase
          .from('toy_replicas')
          .update({ 
            status: finalStatus,
            error: error.message || 'Generation failed',
            retry_count: newRetryCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', toyReplicaId);

        console.log(
          shouldRetry 
            ? `⚠️ Marked for retry (attempt ${newRetryCount}/${MAX_RETRIES})`
            : `❌ Marked as failed after ${newRetryCount} attempts`
        );
      }
    } catch (updateError) {
      console.error('❌ Failed to update error status:', updateError);
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Generation failed',
        details: error instanceof Error ? error.stack : undefined
      }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});