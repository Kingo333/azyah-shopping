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
    
    if (!image_path) {
      throw new Error('No image_path provided');
    }

    console.log('Auto-tagging image:', image_path);

    // Get public URL for the image
    const { data: { publicUrl } } = supabaseClient.storage
      .from('closet-items')
      .getPublicUrl(image_path);

    console.log('Image URL:', publicUrl);

    // Use Lovable AI to analyze the image
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: 'You are a fashion expert analyzing clothing items. Return ONLY valid JSON with category, color_primary, and suggested_tags array.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this clothing item and provide: 1) category (e.g., "tops", "bottoms", "dresses", "outerwear", "shoes", "accessories"), 2) primary color, 3) suggested tags (e.g., "casual", "formal", "summer", "winter"). Return as JSON: {"category": "...", "color_primary": "...", "suggested_tags": [...]}'
              },
              {
                type: 'image_url',
                image_url: { url: publicUrl }
              }
            ]
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'tag_clothing_item',
              description: 'Tag a clothing item with category, color, and style tags',
              parameters: {
                type: 'object',
                properties: {
                  category: {
                    type: 'string',
                    description: 'Main category of the clothing item'
                  },
                  color_primary: {
                    type: 'string',
                    description: 'Primary color of the item'
                  },
                  suggested_tags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Style and occasion tags'
                  }
                },
                required: ['category', 'color_primary', 'suggested_tags'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'tag_clothing_item' } }
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI analysis failed:', aiResponse.status, await aiResponse.text());
      throw new Error(`AI analysis failed: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response:', JSON.stringify(aiData, null, 2));

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const result = toolCall?.function?.arguments 
      ? JSON.parse(toolCall.function.arguments)
      : {
          category: 'clothing',
          color_primary: 'unknown',
          suggested_tags: []
        };

    console.log('Parsed result:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in auto-tag function:', error);
    
    // Return default values instead of error to not block upload
    return new Response(JSON.stringify({
      category: 'clothing',
      color_primary: 'unknown',
      suggested_tags: [],
      error: error.message
    }), {
      status: 200, // Return 200 with defaults to not block workflow
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
