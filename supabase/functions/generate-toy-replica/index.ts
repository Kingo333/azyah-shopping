import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { toyReplicaId } = await req.json();

    if (!toyReplicaId) {
      return new Response(
        JSON.stringify({ error: 'Missing toyReplicaId' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Starting toy replica generation for:', toyReplicaId);

    // Get the toy replica record to access the source image
    const { data: toyReplica, error: fetchError } = await supabase
      .from('toy_replicas')
      .select('*')
      .eq('id', toyReplicaId)
      .single();

    if (fetchError || !toyReplica) {
      console.error('Error fetching toy replica:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Toy replica not found' }), 
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Fetch the source image from storage to process it
    const { data: signedUrlData } = await supabase.storage
      .from('toy-replica-source')
      .createSignedUrl(toyReplica.source_url, 60);

    if (!signedUrlData?.signedUrl) {
      throw new Error('Failed to get source image URL');
    }

    // Download the source image
    const imageResponse = await fetch(signedUrlData.signedUrl);
    const imageBlob = await imageResponse.blob();
    
    console.log('Processing image for LEGO mini-figure generation...');
    
    // For now, we'll upload the original image as the result
    // TODO: Replace with actual LEGO mini-figure generation AI service
    const resultFileName = `results/${toyReplica.user_id}/${toyReplicaId}_result.png`;
    
    // Upload the processed image to storage
    const { error: uploadError } = await supabase.storage
      .from('toy-replica-result')
      .upload(resultFileName, imageBlob, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error('Failed to upload result:', uploadError);
      throw new Error('Failed to upload result image');
    }
    
    console.log('Result uploaded to storage:', resultFileName);
    
    // Update the toy replica with the relative path
    const { data: updatedReplica, error: updateError } = await supabase
      .from('toy_replicas')
      .update({ 
        result_url: resultFileName,
        status: 'succeeded',
        error: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', toyReplicaId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating toy replica:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update toy replica status' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Toy replica generation completed successfully');

    // Return the relative path - the frontend will convert it to the proper URL
    return new Response(
      JSON.stringify({ 
        resultUrl: resultFileName,
        toyReplicaId: toyReplicaId,
        status: 'succeeded'
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in generate-toy-replica function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: 'Failed to generate toy replica'
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});