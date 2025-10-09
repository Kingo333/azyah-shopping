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

    const { image_path } = await req.json();

    // Get image URL
    const { data: { publicUrl } } = supabaseClient.storage
      .from('closet-items')
      .getPublicUrl(image_path);

    // Use Lovable AI for tagging
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a fashion AI assistant. Analyze clothing images and provide categorization.'
          },
          {
            role: 'user',
            content: `Analyze this clothing item image at ${publicUrl} and return JSON with: category (one of: top, bottom, dress, outerwear, shoes, bag, accessory), color_primary (main color), suggested_tags (array of 3-5 style/brand keywords)`
          }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'tag_clothing',
            description: 'Tag a clothing item with category and attributes',
            parameters: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  enum: ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'bag', 'accessory']
                },
                color_primary: { type: 'string' },
                suggested_tags: {
                  type: 'array',
                  items: { type: 'string' }
                }
              },
              required: ['category', 'color_primary', 'suggested_tags']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'tag_clothing' } }
      })
    });

    const data = await response.json();
    
    // Extract function call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const result = toolCall ? JSON.parse(toolCall.function.arguments) : {
      category: 'accessory',
      color_primary: 'unknown',
      suggested_tags: []
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      category: 'accessory',
      color_primary: 'unknown',
      suggested_tags: []
    }), {
      status: 200, // Return 200 with defaults on error
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
