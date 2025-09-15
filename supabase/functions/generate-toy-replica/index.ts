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

    // Simulate toy replica generation (replace with actual AI service call)
    console.log('Simulating toy replica generation...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay

    // Generate a result filename using relative path format
    const resultFileName = `results/${toyReplica.user_id}/${toyReplicaId}_result.png`;
    
    // For demo purposes, we'll use a placeholder image URL
    // In a real implementation, this would be the generated image from the AI service
    const mockResultUrl = 'https://via.placeholder.com/400x400/FF6B6B/FFFFFF?text=LEGO+Mini-Figure';
    
    // Update the toy replica with the relative path instead of absolute URL
    const { data: updatedReplica, error: updateError } = await supabase
      .from('toy_replicas')
      .update({ 
        result_url: resultFileName, // Store relative path
        status: 'succeeded',
        error_message: null,
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