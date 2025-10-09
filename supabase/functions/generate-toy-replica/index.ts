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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { toyReplicaId } = await req.json();
    if (!toyReplicaId) {
      return new Response(
        JSON.stringify({ error: 'Missing toyReplicaId' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🎯 Generating toy replica for ID:', toyReplicaId);

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
      console.error('❌ Toy replica not found or missing source:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Toy replica not found or missing source image' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📥 Downloading source image from:', toyReplica.source_url);

    // Download the source image
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('toy-replica-source')
      .download(toyReplica.source_url);

    if (downloadError || !downloadData) {
      console.error('❌ Failed to download source:', downloadError);
      throw new Error('Failed to download source image');
    }

    console.log('✅ Source image downloaded, size:', downloadData.size);
    console.log('🔄 Processing image...');
    
    // Here you would call your AI service to transform the image
    // For now, we'll just use the original image
    const processedImage = downloadData;

    // Upload the result
    const resultPath = `results/${toyReplica.user_id}/${toyReplicaId}.png`;
    console.log('📤 Uploading result to:', resultPath);

    const { error: uploadError } = await supabase.storage
      .from('toy-replica-result')
      .upload(resultPath, processedImage, {
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

    console.log('✅ Toy replica generation completed');

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