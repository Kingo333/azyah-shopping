import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { canvas_json, canvas_image_base64 } = await req.json();

    console.log('Fit rendering requested for user:', user.id);

    // If client provides base64 image, use it directly
    if (canvas_image_base64) {
      // Extract base64 data
      const base64Data = canvas_image_base64.replace(/^data:image\/\w+;base64,/, '');
      const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      
      // Upload to fits-renders bucket
      const renderFileName = `${user.id}/${crypto.randomUUID()}_render.png`;
      const { error: uploadError } = await supabaseClient.storage
        .from('fits-renders')
        .upload(renderFileName, imageBuffer, {
          contentType: 'image/png',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Failed to upload render: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabaseClient.storage
        .from('fits-renders')
        .getPublicUrl(renderFileName);

      console.log('Fit rendered successfully:', publicUrl);

      return new Response(JSON.stringify({
        render_path: publicUrl,
        message: 'Render completed successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fallback: return placeholder path for client-side rendering
    const renderPath = `${user.id}/${crypto.randomUUID()}_render.png`;
    
    return new Response(JSON.stringify({
      render_path: renderPath,
      message: 'Client-side rendering required - please provide canvas_image_base64'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
